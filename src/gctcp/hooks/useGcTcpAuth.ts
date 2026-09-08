import { useMemo } from "react";
import { useAuthSession } from "@/hooks/connection/useAuthSession";
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

let gctcpAuthRenderCount = 0;

/**
 * Provee la sesión de usuario para el módulo GCTCP.
 *
 * - Modo escritorio (Electron): no requiere sesión de servidor. Se construye un
 *   usuario local desde `sysgd_local_account` (creado en SetupAccountScreen), por
 *   lo que la app funciona 100% offline.
 * - Modo web: delega en la sesión remota habitual (useAuthSession).
 */
export function useGcTcpAuth(): {
	user: User | null;
	loading: boolean;
	desktopMode: boolean;
} {
	const desktopMode = isDesktopMode();
	const remote = useAuthSession();

	let localAccount: { name: string; email: string } | null = null;
	try {
		const raw = localStorage.getItem("sysgd_local_account");
		if (raw) localAccount = JSON.parse(raw) as { name: string; email: string };
	} catch {
		localAccount = null;
	}

	const user = useMemo(() => {
		if (!desktopMode) return remote.user;

		gctcpAuthRenderCount++;
		console.log(
			`[useGcTcpAuth] building local user #${gctcpAuthRenderCount}`,
			localAccount?.email,
		);
		return localAccount
			? buildLocalUser(localAccount.name, localAccount.email)
			: buildLocalUser("Usuario Local", "local@sysgc.local");
	}, [desktopMode, remote.user, localAccount?.email, localAccount?.name]);

	return {
		user,
		loading: desktopMode ? false : remote.loading,
		desktopMode,
	};
}
