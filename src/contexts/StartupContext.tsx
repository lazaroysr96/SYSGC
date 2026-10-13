import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from "react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type StartMode = "cloud" | "backup" | "phone";

interface StartupContextType {
	startMode: StartMode | null;
	isStarted: boolean;
	isLoading: boolean;
	completeStartup: (mode: StartMode) => void;
	resetStartup: () => void;
}

const START_MODE_KEY = "sysgd_start_mode";
const START_DONE_KEY = "sysgd_start_complete";

const StartupContext = createContext<StartupContextType | null>(null);

export function readStartMode(): StartMode | null {
	try {
		const raw = localStorage.getItem(START_MODE_KEY);
		if (raw === "cloud" || raw === "backup" || raw === "phone") return raw;
		return null;
	} catch {
		return null;
	}
}

export function readStartComplete(): boolean {
	try {
		return localStorage.getItem(START_DONE_KEY) === "1";
	} catch {
		return false;
	}
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function StartupProvider({ children }: { children: ReactNode }) {
	const [startMode, setStartMode] = useState<StartMode | null>(null);
	const [isStarted, setIsStarted] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		setStartMode(readStartMode());
		setIsStarted(readStartComplete());
		setIsLoading(false);
	}, []);

	const completeStartup = useCallback((mode: StartMode) => {
		try {
			localStorage.setItem(START_MODE_KEY, mode);
			localStorage.setItem(START_DONE_KEY, "1");
		} catch {
			// almacenamiento no disponible, se continúa en memoria
		}
		setStartMode(mode);
		setIsStarted(true);
	}, []);

	const resetStartup = useCallback(() => {
		try {
			localStorage.removeItem(START_MODE_KEY);
			localStorage.removeItem(START_DONE_KEY);
		} catch {
			// ignorar
		}
		setStartMode(null);
		setIsStarted(false);
	}, []);

	return (
		<StartupContext.Provider
			value={{ startMode, isStarted, isLoading, completeStartup, resetStartup }}
		>
			{children}
		</StartupContext.Provider>
	);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useStartup(): StartupContextType {
	const ctx = useContext(StartupContext);
	if (!ctx) {
		// Fuera del provider (ej. web sin Electron): no se exige modo de inicio
		return {
			startMode: null,
			isStarted: true,
			isLoading: false,
			completeStartup: () => {},
			resetStartup: () => {},
		};
	}
	return ctx;
}
