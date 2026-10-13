import { LocalLedgerRepository } from "./LocalLedgerRepository";
import { RemoteLedgerRepository } from "./RemoteLedgerRepository";
import { BrowserLedgerRepository } from "./BrowserLedgerRepository";
import type { LedgerRepository } from "./LedgerRepository";

export function isDesktopMode(): boolean {
	return typeof window !== "undefined" && Boolean(window.electronAPI);
}

export function isCapacitorMode(): boolean {
	if (typeof window === "undefined") return false;
	const w = window as Window & {
		Capacitor?: { isNativePlatform?: () => boolean };
		capacitor?: unknown;
	};
	if (w.Capacitor?.isNativePlatform) {
		try {
			return w.Capacitor.isNativePlatform();
		} catch {
			return false;
		}
	}
	return Boolean(w.Capacitor ?? w.capacitor);
}

let cachedRepository: LedgerRepository | null = null;

export function getLedgerRepository(): LedgerRepository {
	if (!cachedRepository) {
		if (isDesktopMode()) {
			// PC/Electron: SQLite local + nube (SyncManager).
			cachedRepository = new LocalLedgerRepository();
		} else if (isCapacitorMode()) {
			// Móvil/Capacitor: storage del WebView, 100% offline.
			cachedRepository = new BrowserLedgerRepository();
		} else {
			// Web: nube.
			cachedRepository = new RemoteLedgerRepository();
		}
	}
	return cachedRepository;
}
