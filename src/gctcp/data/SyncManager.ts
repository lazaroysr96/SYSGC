import api from "@/lib/api";
import type {
	CloudLedgerContainer,
	InventarioRegistro,
} from "../../accounting/core/types/accountingTypes";
import type { LedgerRepository } from "./LedgerRepository";
import { LocalLedgerRepository } from "./LocalLedgerRepository";
import { RemoteLedgerRepository } from "./RemoteLedgerRepository";

export type SyncState =
	| "idle"
	| "syncing"
	| "synced"
	| "offline"
	| "no-session"
	| "conflict"
	| "error";

export interface SyncResult {
	state: SyncState;
	message?: string;
	updatedAt?: string | null;
	remoteUpdatedAt?: string | null;
}

const SYNC_TIMESTAMP_KEY = "sysgd_last_sync_updated_at";

function getSavedSyncTime(): string | null {
	try {
		return localStorage.getItem(SYNC_TIMESTAMP_KEY);
	} catch {
		return null;
	}
}

function saveSyncTime(updatedAt: string | null): void {
	try {
		if (updatedAt) {
			localStorage.setItem(SYNC_TIMESTAMP_KEY, updatedAt);
		}
	} catch {
		// sin almacenamiento
	}
}

/**
 * Sincronización opcional del ledger local (SQLite) con el servidor.
 *
 * Requiere que el usuario tenga sesión de servidor (token en localStorage).
 * Resolución de conflictos: last-write-wins por `updatedAt`.
 */
export class SyncManager {
	private readonly local: LedgerRepository;
	private readonly remote: RemoteLedgerRepository;

	constructor() {
		this.local = new LocalLedgerRepository();
		this.remote = new RemoteLedgerRepository();
	}

	/** True si existe una sesión de servidor (token guardado tras iniciar sesión). */
	hasServerSession(): boolean {
		return Boolean(localStorage.getItem("token"));
	}

	/**
	 * Ejecuta la sincronización con detección de conflictos.
	 * 
	 * Flujo:
	 * 1. GET /version: verificar si la nube tiene datos nuevos (ligero)
	 * 2. Si el updatedAt cambió desde el último sync → conflicto
	 * 3. Si hay conflicto, el componente muestra un diálogo y decide
	 * 4. Si no hay conflicto: push local + guardar sync time
	 */
	async sync(): Promise<SyncResult> {
		if (!this.hasServerSession()) {
			return { state: "no-session" };
		}

		try {
			// ── VERIFICAR VERSIÓN (ligero, solo updatedAt) ─────────────────
			const remoteTime = await this.remote.getVersion();
			const savedTime = getSavedSyncTime();

			// Detectar conflicto: la nube tiene datos que no teníamos
			if (remoteTime && savedTime && remoteTime !== savedTime) {
				return {
					state: "conflict",
					message: "La nube tiene datos nuevos (posiblemente del teléfono)",
					updatedAt: remoteTime,
					remoteUpdatedAt: remoteTime,
				};
			}

			// ── PUSH ─────────────────────────────────────────────────────────
			const local = await this.local.loadLedger();
			const registro = local.registro ?? {
				activeWorkspaceId: "",
				workspaces: [],
			};
			await this.remote.saveLedger(
				registro,
				local.inventarioRegistro ?? null,
			);

			// ── SAVE SYNC TIME ───────────────────────────────────────────────
			const newSyncTime = remoteTime ?? local.updatedAt ?? new Date().toISOString();
			saveSyncTime(newSyncTime);

			return {
				state: "synced",
				message: "Sincronizado con la nube",
				updatedAt: newSyncTime,
			};
		} catch {
			return { state: "offline" };
		}
	}

	/**
	 * Resuelve un conflicto: "local" = subir lo mío, "remote" = quedarme con lo remoto.
	 */
	async resolveConflict(choice: "local" | "remote"): Promise<SyncResult> {
		try {
			if (choice === "local") {
				const local = await this.local.loadLedger();
				await this.remote.saveLedger(
					local.registro ?? { activeWorkspaceId: "", workspaces: [] },
					local.inventarioRegistro ?? null,
				);
				const remote = await this.remote.loadLedger();
				saveSyncTime(remote.updatedAt ?? null);
				return {
					state: "synced",
					message: "Tus datos fueron subidos a la nube",
					updatedAt: remote.updatedAt,
				};
			}

			const remote = await this.remote.loadLedger();
			await this.local.saveLedger(
				remote.registro ?? { activeWorkspaceId: "", workspaces: [] },
				remote.inventarioRegistro ?? null,
			);
			saveSyncTime(remote.updatedAt ?? null);
			return {
				state: "synced",
				message: "Datos de la nube aplicados localmente",
				updatedAt: remote.updatedAt,
			};
		} catch {
			return { state: "offline" };
		}
	}

	/** Fuerza la subida del ledger local al servidor. */
	async push(): Promise<SyncResult> {
		if (!this.hasServerSession()) {
			return { state: "no-session" };
		}
		try {
			const local = await this.local.loadLedger();
			const registro = local.registro ?? {
				activeWorkspaceId: "",
				workspaces: [],
			};
			await this.remote.saveLedger(
				registro,
				local.inventarioRegistro ?? null,
			);
			return { state: "synced", message: "Datos subidos a la nube" };
		} catch {
			return { state: "offline" };
		}
	}
}

export function isServerReachable(): Promise<boolean> {
	return api
		.get("/api/status")
		.then((res) => res.status === 200)
		.catch(() => false);
}

export type { CloudLedgerContainer, InventarioRegistro };
