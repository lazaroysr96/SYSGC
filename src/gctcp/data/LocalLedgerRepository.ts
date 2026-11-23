import type {
	CloudLedgerContainer,
	InventarioRegistro,
} from "../../accounting/core/types/accountingTypes";
import type { LedgerApiResponse } from "../types";
import type { LedgerRepository } from "./LedgerRepository";
import { normalizeContainerForStorage } from "../accountingMath";

const EMPTY_LEDGER: CloudLedgerContainer = {
	activeWorkspaceId: "",
	workspaces: [],
};

export class LocalLedgerRepository implements LedgerRepository {
	async loadLedger(): Promise<LedgerApiResponse> {
		const electronAPI = window.electronAPI;
		if (electronAPI?.loadLedger) {
			const response = await electronAPI.loadLedger();
			return response.registro
				? { ...response, registro: normalizeContainerForStorage(response.registro) }
				: response;
		}
		return { registro: EMPTY_LEDGER, inventarioRegistro: null, updatedAt: null };
	}

	async saveLedger(
		registro: CloudLedgerContainer,
		inventarioRegistro: InventarioRegistro | null,
	): Promise<void> {
		const electronAPI = window.electronAPI;
		if (electronAPI?.saveLedger) {
			await electronAPI.saveLedger(normalizeContainerForStorage(registro), inventarioRegistro);
		}
	}
}
