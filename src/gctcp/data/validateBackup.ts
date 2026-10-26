import type { CloudLedgerContainer } from "../../accounting/core/types/accountingTypes";

export interface BackupWorkspaceEntry {
	id: string;
	name: string;
	registro: unknown;
	[key: string]: unknown;
}

export interface ParsedBackup {
	activeWorkspaceId: string;
	workspaces: BackupWorkspaceEntry[];
	[key: string]: unknown;
}

export interface BackupValidation {
	ok: boolean;
	msg: string | null;
	parsed?: CloudLedgerContainer;
	workspaces?: number;
	activeName?: string;
}

const REQUIRED_KEYS = ["activeWorkspaceId", "workspaces"] as const;
const WORKSPACE_KEYS = ["id", "name", "registro"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateBackupText(text: string): BackupValidation {
	if (!text.trim()) return { ok: false, msg: null };

	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message.split(" at ")[0] : "Error de sintaxis";
		return { ok: false, msg: `JSON inválido: ${msg}` };
	}

	if (!isRecord(parsed)) return { ok: false, msg: "Se esperaba un objeto JSON" };

	// Acepta múltiples formatos:
	// 1. Ledger directo: { activeWorkspaceId, workspaces: [...] }
	// 2. Respuesta del servidor: { registro: { activeWorkspaceId, workspaces: [...] } }
	// 3. Respaldo del teléfono: { container: { activeWorkspaceId, workspaces: [...] } }
	let inner: Record<string, unknown> = parsed;

	if ("registro" in inner && isRecord(inner.registro)) {
		inner = inner.registro as Record<string, unknown>;
	} else if ("container" in inner && isRecord(inner.container)) {
		const container = inner.container as Record<string, unknown>;
		if ("workspaces" in container) {
			inner = container;
		}
	}

	const missing = REQUIRED_KEYS.filter((k) => !(k in inner));
	if (missing.length) return { ok: false, msg: `Faltan campos requeridos: ${missing.join(", ")}` };

	if (!Array.isArray(inner.workspaces) || inner.workspaces.length === 0) {
		return { ok: false, msg: '"workspaces" debe ser un array con al menos un espacio de trabajo' };
	}

	const badIdx = (inner.workspaces as unknown[]).findIndex(
		(ws) => !isRecord(ws) || WORKSPACE_KEYS.some((k) => !(k in ws)),
	);
	if (badIdx !== -1) {
		const ws = (inner.workspaces as Record<string, unknown>[])[badIdx];
		const missingWs = WORKSPACE_KEYS.filter((k) => !(k in ws));
		return { ok: false, msg: `workspace[${badIdx}] le faltan campos: ${missingWs.join(", ")}` };
	}

	const typed = inner as unknown as ParsedBackup;
	const active = typed.workspaces.find((w) => w.id === typed.activeWorkspaceId);
	if (!active) {
		return {
			ok: false,
			msg: `activeWorkspaceId "${String(typed.activeWorkspaceId)}" no coincide con ningún workspace`,
		};
	}

	return {
		ok: true,
		msg: `Estructura válida — ${typed.workspaces.length} espacio(s), activo: "${active.name}"`,
		parsed: inner as unknown as CloudLedgerContainer,
		workspaces: typed.workspaces.length,
		activeName: active.name,
	};
}
