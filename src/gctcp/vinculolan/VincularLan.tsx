import { type FC, useRef, useState } from "react";
import { Link2, Loader2, MonitorSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { CloudLedgerContainer } from "../../accounting/core/types/accountingTypes";
import { getLedgerRepository } from "../data/getLedgerRepository";

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type VinculoLanPerfil = {
	nombre: string;
	correo: string;
};

export type VinculoLanDatos = {
	perfil: VinculoLanPerfil;
	ledger: CloudLedgerContainer;
};

type EstadoDescarga =
	| { fase: "idle" }
	| { fase: "descargando" }
	| { fase: "error"; mensaje: string }
	| { fase: "previa"; datos: VinculoLanDatos };

// ─── Validación (mismas claves que UploadBackupPanel + sobre del teléfono) ──

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
	typeof valor === "object" && valor !== null && !Array.isArray(valor);

function validarSobre(parsed: unknown): VinculoLanDatos | null {
	if (!esObjeto(parsed)) return null;
	if (parsed.origen !== "SYSGD-Cont-Android") return null;
	if (typeof parsed.version !== "number" || parsed.version > 1) return null;
	if (!esObjeto(parsed.perfil)) return null;
	if (!esObjeto(parsed.ledger)) return null;
	const ledger = parsed.ledger;
	if (typeof ledger.activeWorkspaceId !== "string" || !Array.isArray(ledger.workspaces)) return null;
	if (ledger.workspaces.length === 0) return null;
	for (const ws of ledger.workspaces) {
		if (!esObjeto(ws)) return null;
		if (typeof ws.id !== "string" || typeof ws.name !== "string") return null;
		if (!esObjeto(ws.registro)) return null;
	}
	const perfil = parsed.perfil;
	return {
		perfil: {
			nombre: typeof perfil.nombre === "string" ? perfil.nombre : "",
			correo: typeof perfil.correo === "string" ? perfil.correo : "",
		},
		ledger: ledger as unknown as CloudLedgerContainer,
	};
}

// ─── Diálogo ────────────────────────────────────────────────────────────────

export const VincularLanDialog: FC<{
	open: boolean;
	onOpenChange: (open: boolean) => void;
	tituloConfirmar?: string;
	onDatos: (datos: VinculoLanDatos) => void;
}> = ({ open, onOpenChange, tituloConfirmar = "Importar y vincular", onDatos }) => {
	const [link, setLink] = useState("");
	const [estado, setEstado] = useState<EstadoDescarga>({ fase: "idle" });
	const abortRef = useRef<AbortController | null>(null);

	const linkValido = /^http:\/\/\d{1,3}(\.\d{1,3}){3}:\d+\/v\?token=[A-Za-z0-9]+$/.test(link.trim());

	const cerrar = (abierto: boolean): void => {
		if (!abierto) {
			abortRef.current?.abort();
			setEstado({ fase: "idle" });
		}
		onOpenChange(abierto);
	};

	const descargar = async (): Promise<void> => {
		abortRef.current?.abort();
		const abort = new AbortController();
		abortRef.current = abort;
		const expira = window.setTimeout(() => abort.abort(), 20000);
		setEstado({ fase: "descargando" });
		try {
			const respuesta = await fetch(link.trim(), { signal: abort.signal });
			if (!respuesta.ok) {
				throw new Error(
					respuesta.status === 403
						? "El teléfono rechazó el link (token inválido)."
						: respuesta.status === 410
							? "El link expiró o ya se usó. Genera otro en el teléfono."
							: `El teléfono respondió ${respuesta.status}.`,
				);
			}
			const parsed: unknown = await respuesta.json();
			const datos = validarSobre(parsed);
			if (!datos) throw new Error("El teléfono no envió datos válidos de vinculación.");
			setEstado({ fase: "previa", datos });
		} catch (error: unknown) {
			if (error instanceof DOMException && error.name === "AbortError") {
				setEstado({ fase: "error", mensaje: "Sin respuesta: verifica que la PC y el teléfono estén en el mismo Wi-Fi." });
			} else {
				setEstado({
					fase: "error",
					mensaje: error instanceof Error ? error.message : "No se pudo descargar.",
				});
			}
		} finally {
			window.clearTimeout(expira);
		}
	};

	return (
		<Dialog open={open} onOpenChange={cerrar}>
			<DialogContent className="max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Vincular con un dispositivo</DialogTitle>
					<DialogDescription>
						Pega el link que genera el teléfono en Más → Vincular PC (Wi-Fi). Sirve una sola vez.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-3">
					<div className="space-y-1.5">
						<Label htmlFor="vinculo-link">Link del teléfono</Label>
						<Input
							id="vinculo-link"
							value={link}
							onChange={(event) => setLink(event.target.value)}
							placeholder="http://192.168.1.5:1234/v?token=…"
							spellCheck={false}
							autoComplete="off"
						/>
					</div>
					{estado.fase === "error" && (
						<p className="text-sm text-red-600 dark:text-red-400">{estado.mensaje}</p>
					)}
					{estado.fase === "previa" && (
						<div className="rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-900">
							<p className="font-medium">
								{estado.datos.perfil.nombre || "Negocio del teléfono"}
								{estado.datos.perfil.correo ? ` · ${estado.datos.perfil.correo}` : ""}
							</p>
							<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
								{estado.datos.ledger.workspaces.length} espacio(s) · activo:{" "}
								{estado.datos.ledger.workspaces.find(
									(ws) => ws.id === estado.datos.ledger.activeWorkspaceId,
								)?.name ?? "—"}
							</p>
							<p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
								Esto reemplaza los datos actuales de esta PC.
							</p>
						</div>
					)}
				</div>
				<DialogFooter className="gap-2">
					<Button type="button" variant="outline" onClick={() => cerrar(false)}>
						Cancelar
					</Button>
					{estado.fase === "previa" ? (
						<Button
							type="button"
							onClick={() => {
								onDatos(estado.datos);
								cerrar(false);
							}}
						>
							{tituloConfirmar}
						</Button>
					) : (
						<Button type="button" onClick={descargar} disabled={!linkValido || estado.fase === "descargando"}>
							{estado.fase === "descargando" ? (
								<>
									<Loader2 className="size-4 animate-spin" />
									Descargando…
								</>
							) : (
								"Descargar datos"
							)}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

// ─── Tarjeta para usar dentro de la app (Respaldo → Sincronizar por LAN) ────

export const VincularLanCard: FC<{ onImportado: () => void }> = ({ onImportado }) => {
	const { toast } = useToast();
	const [abierto, setAbierto] = useState(false);
	const [importando, setImportando] = useState(false);

	const importar = async (datos: VinculoLanDatos): Promise<void> => {
		setImportando(true);
		try {
			await getLedgerRepository().saveLedger(datos.ledger, null);
			toast({ title: "Sincronizado por LAN", description: "Los datos del teléfono quedaron en esta PC." });
			onImportado();
		} catch {
			toast({
				title: "No se pudo importar",
				description: "Los datos no fueron modificados. Intenta de nuevo.",
				variant: "destructive",
			});
		} finally {
			setImportando(false);
		}
	};

	return (
		<div className="rounded-lg border border-slate-200 p-4 shadow-sm dark:border-slate-800">
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300">
						<MonitorSmartphone className="size-5" />
					</div>
					<div>
						<p className="text-sm font-medium">Sincronizar por LAN</p>
						<p className="text-xs text-slate-500 dark:text-slate-400">
							Trae los datos del teléfono con un link de un solo uso.
						</p>
					</div>
				</div>
				<Button type="button" variant="outline" size="sm" onClick={() => setAbierto(true)} disabled={importando}>
					<Link2 className="size-4" />
					{importando ? "Importando…" : "Vincular"}
				</Button>
			</div>
			<VincularLanDialog
				open={abierto}
				onOpenChange={setAbierto}
				tituloConfirmar="Importar datos"
				onDatos={(datos) => {
					void importar(datos);
				}}
			/>
		</div>
	);
};
