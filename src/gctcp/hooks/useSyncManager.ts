import { useCallback, useEffect, useRef, useState } from "react";
import type { SyncResult, SyncState } from "../data/SyncManager";
import { SyncManager } from "../data/SyncManager";

const SYNC_INTERVAL_MS = 60_000;

interface UseSyncManagerReturn {
	state: SyncState;
	lastSync: string | null;
	message: string | null;
	dataVersion: number;
	runSync: () => Promise<SyncResult>;
	resolveConflict: (choice: "local" | "remote") => Promise<SyncResult>;
	isDesktop: boolean;
}

/**
 * Orquesta la sincronización del ledger local con el servidor.
 * Solo activa la sincronización cuando:
 *  - Corremos en modo escritorio (Electron)
 *  - El usuario inició sesión en el servidor (hay token)
 */
export function useSyncManager(
	isDesktop: boolean,
	cloudMode: boolean,
): UseSyncManagerReturn {
	const [state, setState] = useState<SyncState>("idle");
	const [message, setMessage] = useState<string | null>(null);
	const [lastSync, setLastSync] = useState<string | null>(null);
	const [dataVersion, setDataVersion] = useState(0);
	const managerRef = useRef<SyncManager | null>(null);
	const inFlight = useRef<boolean>(false);
	const shouldSync = isDesktop && cloudMode;

	const getManager = useCallback(() => {
		if (!managerRef.current) managerRef.current = new SyncManager();
		return managerRef.current;
	}, []);

	const runSync = useCallback(async (): Promise<SyncResult> => {
		if (!shouldSync || inFlight.current) {
			return { state: getManager().hasServerSession() ? "idle" : "no-session" };
		}
		inFlight.current = true;
		setState("syncing");
		try {
			const result = await getManager().sync({ preferRemote: cloudMode });
			setState(result.state);
			setMessage(result.message ?? null);
			if (result.updatedAt) setLastSync(result.updatedAt);
			if (result.pulled) setDataVersion((version) => version + 1);
			return result;
		} finally {
			inFlight.current = false;
		}
	}, [shouldSync, cloudMode, getManager]);

	// Primera sincronización al montar (si hay sesión) + sync periódico
	useEffect(() => {
		if (!shouldSync) return;
		void runSync();
		const interval = setInterval(() => void runSync(), SYNC_INTERVAL_MS);
		return () => clearInterval(interval);
	}, [shouldSync, runSync]);

	const resolveConflict = useCallback(
		async (choice: "local" | "remote"): Promise<SyncResult> => {
			if (!shouldSync) return { state: "no-session" };
			inFlight.current = true;
			setState("syncing");
			try {
				const result = await getManager().resolveConflict(choice);
				setState(result.state);
				setMessage(result.message ?? null);
				if (result.updatedAt) setLastSync(result.updatedAt);
				if (result.pulled) setDataVersion((version) => version + 1);
				return result;
			} finally {
				inFlight.current = false;
			}
		},
		[shouldSync, getManager],
	);

	return {
		state,
		lastSync,
		message,
		dataVersion,
		runSync,
		resolveConflict,
		isDesktop,
	};
}
