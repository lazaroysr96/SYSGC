import { useMemo } from "react";
import { useAuthSession } from "@/hooks/connection/useAuthSession";
import { readStartMode } from "@/contexts/StartupContext";
import { isDesktopMode } from "../data/getLedgerRepository";
import type { User } from "@/types/user";

function buildLocalUser(name: string, email: string): User {
	return {
		id: "local-desktop-user",
		name,
		email,
		privileges: "user",
		status: "active",
		is_public: false,
		user_data: {
			billing: {
				tier: "pro",
				ai_task_credits: -1,
				purchased_credits: 0,
				limits: {
					max_projects: -1,
					max_documents: -1,
					max_task_per_projects: -1,
					max_team_members: -1,
					github_integration: true,
					bank_ideas: true,
					chat: true,
					custom_gemini_token: true,
					priority_support: true,
				},
				billing_cycle: {
					last_reset: new Date().toISOString(),
					next_reset: new Date(
						Date.now() + 30 * 24 * 60 * 60 * 1000,
					).toISOString(),
				},
			},
		},
		created_at: new Date().toISOString(),
	};
}

/**
 * Provee la sesión de usuario para el módulo GCTCP.
 *
 * - Modo escritorio + nube: delega en la sesión del servidor (cuenta SYSGD).
 *   El trabajo online usa la nube y la salvaguarda local + SyncManager cubre
 *   la pérdida de conexión y el trabajo offline posterior.
 * - Modo escritorio + backup/teléfono (o sin modo): usuario local 100% offline.
 * - Modo web: delega en la sesión remota habitual (useAuthSession).
 */
export function useGcTcpAuth(): {
	user: User | null;
	loading: boolean;
	desktopMode: boolean;
} {
	const desktopMode = isDesktopMode();
	const remote = useAuthSession();
	const startMode = desktopMode ? readStartMode() : null;

	let localAccount: { name: string; email: string } | null = null;
	try {
		const raw = localStorage.getItem("sysgd_local_account");
		if (raw) localAccount = JSON.parse(raw) as { name: string; email: string };
	} catch {
		localAccount = null;
	}

	const localUser = useMemo(() => {
		return localAccount
			? buildLocalUser(localAccount.name, localAccount.email)
			: buildLocalUser("Usuario Local", "local@sysgc.local");
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [localAccount?.email, localAccount?.name]);

	if (!desktopMode) {
		return { user: remote.user, loading: remote.loading, desktopMode };
	}

	// En escritorio, el modo nube exige sesión del servidor.
	if (startMode === "cloud") {
		return { user: remote.user, loading: remote.loading, desktopMode };
	}

	return { user: localUser, loading: false, desktopMode };
}
