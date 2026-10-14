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
	| "error";

export interface SyncResult {
	state: SyncState;
	message?: string;
	updatedAt?: string | null;
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
	 * Ejecuta la sincronización completa (push + pull).
	 * 
	 * Orden: push primero para no perder cambios locales (p. ej. subidos por
	 * otro dispositivo como el teléfono), luego pull para traer cambios remotos.
	 * El servidor resuelve conflictos por last-write-wins basado en updatedAt.
	 */
	async sync(): Promise<SyncResult> {
		if (!this.hasServerSession()) {
			return { state: "no-session" };
		}

		try {
			// ── PUSH ─────────────────────────────────────────────────────────
			// Subir cambios locales primero para evitar pérdidas si otro
			// dispositivo (teléfono) actualizó la nube después del último pull.
			const local = await this.local.loadLedger();
			const registro = local.registro ?? {
				activeWorkspaceId: "",
				workspaces: [],
			};
			await this.remote.saveLedger(
				registro,
				local.inventarioRegistro ?? null,
			);

			// ── PULL ─────────────────────────────────────────────────────────
			// Traer datos remotos (pueden incluir cambios del teléfono)
			const remote = await this.remote.loadLedger();

			const remoteTime = remote.updatedAt
				? new Date(remote.updatedAt).getTime()
				: 0;

			if (remote.registro && remoteTime > 0) {
				await this.local.saveLedger(
					remote.registro,
					remote.inventarioRegistro ?? null,
				);
				return {
					state: "synced",
					message: "Sincronizado con la nube",
					updatedAt: remote.updatedAt,
				};
			}

			return {
				state: "synced",
				message: "Datos subidos a la nube",
				updatedAt: local.updatedAt,
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
