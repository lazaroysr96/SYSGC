import { LocalLedgerRepository } from "./LocalLedgerRepository";
import { RemoteLedgerRepository } from "./RemoteLedgerRepository";
import type { LedgerRepository } from "./LedgerRepository";

export function isDesktopMode(): boolean {
	return typeof window !== "undefined" && Boolean(window.electronAPI);
}

let cachedRepository: LedgerRepository | null = null;

export function getLedgerRepository(): LedgerRepository {
	if (!cachedRepository) {
		cachedRepository = isDesktopMode()
			? new LocalLedgerRepository()
			: new RemoteLedgerRepository();
	}
	return cachedRepository;
}
