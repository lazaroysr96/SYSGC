import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from "react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ServerAccount {
	id: string;
	name: string;
	serverUrl: string;
	email: string;
	lastUsed: number;
}

interface ServerContextType {
	serverUrl: string;
	accounts: ServerAccount[];
	activeAccount: ServerAccount | null;
	setServerUrl: (url: string) => void;
	switchAccount: (accountId: string) => void;
	addAccount: (account: Omit<ServerAccount, "id" | "lastUsed">) => void;
	removeAccount: (accountId: string) => void;
	testServer: (url: string) => Promise<boolean>;
}

const SERVER_URL_KEY = "sysgd_server_url";
const ACCOUNTS_KEY = "sysgd_server_accounts";
const ACTIVE_ACCOUNT_KEY = "sysgd_active_account";

const DEFAULT_SERVER_URL = "https://sysgd-production.up.railway.app";

const ServerContext = createContext<ServerContextType | null>(null);

function readAccounts(): ServerAccount[] {
	try {
		const raw = localStorage.getItem(ACCOUNTS_KEY);
		if (!raw) return [];
		return JSON.parse(raw) as ServerAccount[];
	} catch {
		return [];
	}
}

function readServerUrl(): string {
	try {
		return localStorage.getItem(SERVER_URL_KEY) || DEFAULT_SERVER_URL;
	} catch {
		return DEFAULT_SERVER_URL;
	}
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ServerProvider({ children }: { children: ReactNode }) {
	const [serverUrl, setServerUrlState] = useState<string>(DEFAULT_SERVER_URL);
	const [accounts, setAccounts] = useState<ServerAccount[]>([]);
	const [activeAccountId, setActiveAccountId] = useState<string | null>(null);

	useEffect(() => {
		const url = readServerUrl();
		const accs = readAccounts();
		const active = localStorage.getItem(ACTIVE_ACCOUNT_KEY);

		setServerUrlState(url);
		setAccounts(accs);
		if (active && accs.some((a) => a.id === active)) {
			setActiveAccountId(active);
		} else if (accs.length > 0) {
			setActiveAccountId(accs[0].id);
		}
	}, []);

	const persistAccounts = useCallback((next: ServerAccount[]) => {
		setAccounts(next);
		localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(next));
	}, []);

	const setServerUrl = useCallback(
		(url: string) => {
			const trimmed = url.trim();
			setServerUrlState(trimmed);
			localStorage.setItem(SERVER_URL_KEY, trimmed);
		},
	[]
	);

	const switchAccount = useCallback(
		(accountId: string) => {
			const account = accounts.find((a) => a.id === accountId);
			if (!account) return;

			setActiveAccountId(accountId);
			localStorage.setItem(ACTIVE_ACCOUNT_KEY, accountId);
			setServerUrlState(account.serverUrl);
			localStorage.setItem(SERVER_URL_KEY, account.serverUrl);

			// Actualizar último uso
			const updated = accounts.map((a) =>
				a.id === accountId ? { ...a, lastUsed: Date.now() } : a
			);
			persistAccounts(updated);
		},
		[accounts, persistAccounts]
	);

	const addAccount = useCallback(
		(account: Omit<ServerAccount, "id" | "lastUsed">) => {
			const newAccount: ServerAccount = {
				...account,
				id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
				lastUsed: Date.now(),
			};
			const updated = [...accounts, newAccount];
			persistAccounts(updated);
			setActiveAccountId(newAccount.id);
			localStorage.setItem(ACTIVE_ACCOUNT_KEY, newAccount.id);
			setServerUrlState(newAccount.serverUrl);
			localStorage.setItem(SERVER_URL_KEY, newAccount.serverUrl);
		},
		[accounts, persistAccounts]
	);

	const removeAccount = useCallback(
		(accountId: string) => {
			const updated = accounts.filter((a) => a.id !== accountId);
			persistAccounts(updated);

			if (activeAccountId === accountId) {
				const next = updated[0];
				if (next) {
					setActiveAccountId(next.id);
					localStorage.setItem(ACTIVE_ACCOUNT_KEY, next.id);
					setServerUrlState(next.serverUrl);
					localStorage.setItem(SERVER_URL_KEY, next.serverUrl);
				} else {
					setActiveAccountId(null);
					localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
				}
			}
		},
		[accounts, activeAccountId, persistAccounts]
	);

	const testServer = useCallback(async (url: string): Promise<boolean> => {
		try {
			const response = await fetch(`${url.trim()}/api/status`, {
				method: "GET",
				headers: { "Content-Type": "application/json" },
			});
			return response.status === 200;
		} catch {
			return false;
		}
	}, []);

	const activeAccount = accounts.find((a) => a.id === activeAccountId) ?? null;

	return (
		<ServerContext.Provider
			value={{
				serverUrl,
				accounts,
				activeAccount,
				setServerUrl,
				switchAccount,
				addAccount,
				removeAccount,
				testServer,
			}}
		>
			{children}
		</ServerContext.Provider>
	);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useServer(): ServerContextType {
	const ctx = useContext(ServerContext);
	if (!ctx) {
		throw new Error("useServer debe usarse dentro de ServerProvider");
	}
	return ctx;
}
