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
	 * Ejecuta la sincronización completa (pull + push).
	 * 1. Si no hay sesión de servidor → no-session.
	 * 2. Pull: trae el remoto; si es más nuevo que el local, lo aplica local.
	 * 3. Push: si el local es más nuevo (o el remoto no existe), lo sube.
	 */
	async sync(): Promise<SyncResult> {
		if (!this.hasServerSession()) {
			return { state: "no-session" };
		}

		let remote: LedgerApiResponse | null = null;

		try {
			// ── PULL ─────────────────────────────────────────────────────────
			remote = await this.remote.loadLedger();
		} catch {
			// Sin conexión / servidor inaccesible
			return { state: "offline" };
		}

		try {
			const local = await this.local.loadLedger();

			const remoteTime = remote.updatedAt
				? new Date(remote.updatedAt).getTime()
				: 0;
			const localTime = local.updatedAt
				? new Date(local.updatedAt).getTime()
				: 0;

			if (remote.registro && remoteTime > localTime) {
				// El remoto es más nuevo → aplicarlo localmente
				await this.local.saveLedger(
					remote.registro,
					remote.inventarioRegistro ?? null,
				);
				return {
					state: "synced",
					message: "Datos actualizados desde la nube",
					updatedAt: remote.updatedAt,
				};
			}

			if (localTime > remoteTime || !remote.registro) {
				// El local es más nuevo (o no hay remoto) → subirlo
				const registro = local.registro ?? {
					activeWorkspaceId: "",
					workspaces: [],
				};
				await this.remote.saveLedger(
					registro,
					local.inventarioRegistro ?? null,
				);
				return {
					state: "synced",
					message: "Datos subidos a la nube",
					updatedAt: local.updatedAt,
				};
			}

			// Iguales → ya sincronizados
			return {
				state: "synced",
				message: "Todo sincronizado",
				updatedAt: local.updatedAt,
			};
		} catch {
			return { state: "error" };
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
