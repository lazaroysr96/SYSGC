import api from "@/lib/api";
import type {
	CloudLedgerContainer,
	InventarioRegistro,
} from "../../accounting/core/types/accountingTypes";
import type { LedgerApiResponse } from "../types";
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
	/** true cuando el ledger local fue reemplazado por el de la nube. */
	pulled?: boolean;
}

export interface SyncOptions {
	/** En el primer inicio desde la nube, la nube manda sobre el equipo local. */
	preferRemote?: boolean;
}

const EMPTY_LEDGER: CloudLedgerContainer = {
	activeWorkspaceId: "",
	workspaces: [],
};

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

	private hasWorkspaces(registro: CloudLedgerContainer | null): boolean {
		return Boolean(registro?.workspaces?.length);
	}

	private isRemoteNewer(remote: LedgerApiResponse, local: LedgerApiResponse): boolean {
		if (!remote.updatedAt) return false;
		if (!local.updatedAt) return true;
		return remote.updatedAt > local.updatedAt;
	}

	/**
	 * Ejecuta la sincronización con detección de conflictos.
	 *
	 * Primer inicio desde la nube: descarga el ledger remoto y lo establece
	 * localmente. En sincronizaciones posteriores: si la nube cambió, pide
	 * resolución de conflicto; si no, sube los cambios locales.
	 */
	async sync(options: SyncOptions = {}): Promise<SyncResult> {
		if (!this.hasServerSession()) {
			return { state: "no-session" };
		}

		try {
			// ── VERIFICAR VERSIÓN (ligero, solo updatedAt) ─────────────────
			const remoteTime = await this.remote.getVersion();
			const savedTime = getSavedSyncTime();

			// ── PRIMER SYNC: ESTABLECER LA BASE DE DATOS ───────────────────
			if (!savedTime) {
				const local = await this.local.loadLedger();
				const localRegistro = local.registro ?? EMPTY_LEDGER;
				const localHasData = this.hasWorkspaces(localRegistro);

				const remote = await this.remote.loadLedger();
				const remoteRegistro = remote.registro ?? EMPTY_LEDGER;
				const remoteHasData = this.hasWorkspaces(remoteRegistro);

				if (
					remoteHasData &&
					(options.preferRemote ||
						!localHasData ||
						this.isRemoteNewer(remote, local))
				) {
					await this.local.saveLedger(
						remoteRegistro,
						remote.inventarioRegistro ?? null,
					);
					const syncTime = remote.updatedAt ?? remoteTime ?? null;
					saveSyncTime(syncTime);
					return {
						state: "synced",
						message: "Datos de la nube descargados",
						updatedAt: syncTime,
						pulled: true,
					};
				}

				if (localHasData) {
					await this.remote.saveLedger(
						localRegistro,
						local.inventarioRegistro ?? null,
					);
					const pushedTime = await this.remote.getVersion().catch(() => null);
					const syncTime =
						pushedTime ?? remoteTime ?? local.updatedAt ?? new Date().toISOString();
					saveSyncTime(syncTime);
					return {
						state: "synced",
						message: "Datos locales subidos a la nube",
						updatedAt: syncTime,
					};
				}

				const syncTime = remote.updatedAt ?? remoteTime ?? null;
				saveSyncTime(syncTime);
				return {
					state: "synced",
					message: "Sin datos para sincronizar",
					updatedAt: syncTime,
				};
			}

			const local = await this.local.loadLedger();
			const registro = local.registro ?? EMPTY_LEDGER;
			const localHasData = this.hasWorkspaces(registro);

			if (!localHasData) {
				const remote = await this.remote.loadLedger();
				const remoteRegistro = remote.registro ?? EMPTY_LEDGER;
				if (this.hasWorkspaces(remoteRegistro)) {
					await this.local.saveLedger(
						remoteRegistro,
						remote.inventarioRegistro ?? null,
					);
					const syncTime = remote.updatedAt ?? remoteTime ?? null;
					saveSyncTime(syncTime);
					return {
						state: "synced",
						message: "Datos de la nube descargados",
						updatedAt: syncTime,
						pulled: true,
					};
				}
			}

			// Detectar conflicto: la nube tiene datos que no teníamos
			if (remoteTime && remoteTime !== savedTime) {
				return {
					state: "conflict",
					message: "La nube tiene datos nuevos (posiblemente del teléfono)",
					updatedAt: remoteTime,
					remoteUpdatedAt: remoteTime,
				};
			}

			// ── PUSH ─────────────────────────────────────────────────────────
			await this.remote.saveLedger(
				registro,
				local.inventarioRegistro ?? null,
			);

			// ── SAVE SYNC TIME ───────────────────────────────────────────────
			const pushedTime = await this.remote.getVersion().catch(() => null);
			const newSyncTime =
				pushedTime ?? remoteTime ?? local.updatedAt ?? new Date().toISOString();
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
				pulled: true,
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
			const pushedTime = await this.remote.getVersion().catch(() => null);
			saveSyncTime(pushedTime);
			return {
				state: "synced",
				message: "Datos subidos a la nube",
				updatedAt: pushedTime,
			};
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
