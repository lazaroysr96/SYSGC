import type {
	CloudLedgerContainer,
	InventarioRegistro,
} from "../../accounting/core/types/accountingTypes";
import type { LedgerApiResponse } from "../types";
import type { LedgerRepository } from "./LedgerRepository";

const STORAGE_KEY = "sysgc_ledger_browser";

const EMPTY_LEDGER: CloudLedgerContainer = {
	activeWorkspaceId: "",
	workspaces: [],
};

/**
 * Persistencia local del navegador/WebView (localStorage).
 * Es lo que permite que la variante Capacitor funcione 100% offline:
 * el shell de la app viaja dentro del APK y los datos quedan en el equipo.
 */
export class BrowserLedgerRepository implements LedgerRepository {
	private readStored(): LedgerApiResponse {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) {
				return { registro: EMPTY_LEDGER, inventarioRegistro: null, updatedAt: null };
			}
			const parsed = JSON.parse(raw) as Partial<LedgerApiResponse>;
			if (
				typeof parsed !== "object" ||
				parsed === null ||
				!parsed.registro ||
				typeof parsed.registro !== "object" ||
				!Array.isArray((parsed.registro as CloudLedgerContainer).workspaces)
			) {
				return { registro: EMPTY_LEDGER, inventarioRegistro: null, updatedAt: null };
			}
			return {
				registro: parsed.registro as CloudLedgerContainer,
				inventarioRegistro: (parsed.inventarioRegistro as InventarioRegistro | null) ?? null,
				updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
			};
		} catch {
			return { registro: EMPTY_LEDGER, inventarioRegistro: null, updatedAt: null };
		}
	}

	async loadLedger(): Promise<LedgerApiResponse> {
		return this.readStored();
	}

	async saveLedger(
		registro: CloudLedgerContainer,
		inventarioRegistro: InventarioRegistro | null,
	): Promise<void> {
		const payload: LedgerApiResponse = {
			registro,
			inventarioRegistro: inventarioRegistro ?? null,
			updatedAt: new Date().toISOString(),
		};
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
		} catch {
			// Sin espacio o sin almacenamiento: se continúa en memoria.
		}
	}
}
