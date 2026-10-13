import { useRef, useState, type FC, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
	Building2,
	Cloud,
	FileJson,
	Loader2,
	Smartphone,
	X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStartup } from "@/contexts/StartupContext";
import { getLedgerRepository } from "@/gctcp/data/getLedgerRepository";
import { validateBackupText } from "@/gctcp/data/validateBackup";
import {
	VincularLanDialog,
	type VinculoLanDatos,
} from "@/gctcp/vinculolan/VincularLan";
import { useToast } from "@/hooks/use-toast";
import type { CloudLedgerContainer } from "@/accounting/core/types/accountingTypes";
import type { InventarioRegistro } from "@/accounting/core/types/accountingTypes";

// ─── Tarjeta reutilizable ─────────────────────────────────────────────────────

interface StartModeCardProps {
	icon: ReactNode;
	title: string;
	description: string;
	footer: string;
	children: ReactNode;
}

const StartModeCard: FC<StartModeCardProps> = ({
	icon,
	title,
	description,
	footer,
	children,
}) => (
	<div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
		<div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300">
			{icon}
		</div>
		<h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
		<p className="mt-1 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
			{description}
		</p>
		<p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{footer}</p>
		<div className="mt-4">{children}</div>
	</div>
);

// ─── Pantalla ─────────────────────────────────────────────────────────────────

function extractInventario(text: string): InventarioRegistro | null {
	try {
		const parsed: unknown = JSON.parse(text);
		if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
		const obj = parsed as Record<string, unknown>;
		if ("inventarioRegistro" in obj && typeof obj.inventarioRegistro === "object") {
			return obj.inventarioRegistro as InventarioRegistro;
		}
		return null;
	} catch {
		return null;
	}
}

const StartModeScreen: FC = () => {
	const navigate = useNavigate();
	const { toast } = useToast();
	const { completeStartup } = useStartup();

	const [backupText, setBackupText] = useState("");
	const [backupName, setBackupName] = useState<string | null>(null);
	const [openingBackup, setOpeningBackup] = useState(false);
	const [linkOpen, setLinkOpen] = useState(false);
	const [importingLink, setImportingLink] = useState(false);
	const fileRef = useRef<HTMLInputElement>(null);

	const validation = validateBackupText(backupText);
	const isElectron = Boolean(window.electronAPI);

	// ── 1. Nube ──
	const handleCloud = (): void => {
		completeStartup("cloud");
		navigate("/login");
	};

	// ── 2. Copia de seguridad ──
	const handlePickFile = (): void => {
		fileRef.current?.click();
	};

	const handleFileChange = (file: File | undefined): void => {
		if (!file) return;
		if (!file.name.toLowerCase().endsWith(".json")) {
			toast({
				title: "Archivo no válido",
				description: "Solo se aceptan archivos .json",
				variant: "destructive",
			});
			return;
		}
		const reader = new FileReader();
		reader.onload = (e) => {
			setBackupText((e.target?.result as string) ?? "");
			setBackupName(file.name);
		};
		reader.readAsText(file);
	};

	const handleOpenBackup = async (): Promise<void> => {
		if (!validation.ok || !validation.parsed || openingBackup) return;
		setOpeningBackup(true);
		try {
			const inventario = extractInventario(backupText);
			await getLedgerRepository().saveLedger(
				validation.parsed as CloudLedgerContainer,
				inventario,
			);
			completeStartup("backup");
			navigate("/gctcp");
		} catch {
			toast({
				title: "No se pudo abrir la copia",
				description: "El archivo es válido pero no se pudo guardar localmente.",
				variant: "destructive",
			});
		} finally {
			setOpeningBackup(false);
		}
	};

	// ── 3. Vínculo con teléfono ──
	const handleLinkData = async (datos: VinculoLanDatos): Promise<void> => {
		setImportingLink(true);
		try {
			await getLedgerRepository().saveLedger(datos.ledger, null);
			if (datos.perfil.nombre || datos.perfil.correo) {
				try {
					localStorage.setItem(
						"sysgd_local_account",
						JSON.stringify({
							name: datos.perfil.nombre || "Usuario del teléfono",
							email: datos.perfil.correo || "telefono@sysgd.local",
						}),
					);
				} catch {
					// sin almacenamiento, se continúa igual
				}
			}
			completeStartup("phone");
			navigate("/gctcp");
		} catch {
			toast({
				title: "No se pudo vincular",
				description: "Revisa el link e intenta de nuevo.",
				variant: "destructive",
			});
		} finally {
			setImportingLink(false);
		}
	};

	return (
		<div className="min-h-screen overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950 sm:p-6">
			<div className="mx-auto w-full max-w-5xl">
				{/* Cabecera */}
				<div className="flex items-start justify-between gap-4 py-6">
					<div className="flex items-center gap-3">
						<div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg">
							<Building2 className="size-6 text-white" />
						</div>
						<div>
							<h1 className="text-2xl font-bold text-slate-900 dark:text-white">
								SYSGD — ¿Cómo quieres empezar?
							</h1>
							<p className="text-sm text-slate-600 dark:text-slate-300">
								Elige una forma de iniciar. Podrás cambiarla más tarde desde Respaldo.
							</p>
						</div>
					</div>
					{isElectron && (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							onClick={() => window.electronAPI?.close()}
							aria-label="Cerrar aplicación"
						>
							<X className="size-5" />
						</Button>
					)}
				</div>

				{/* Opciones */}
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					<StartModeCard
						icon={<Cloud className="size-6" />}
						title="Iniciar desde la nube"
						description="Entra con tu cuenta SYSGD y trabaja conectado. Todo se guarda en la nube y queda una salvaguarda local: si se pierde la conexión sigues trabajando offline y se sincroniza después."
						footer="Requiere internet para el primer inicio de sesión."
					>
						<Button type="button" className="w-full" onClick={handleCloud}>
							Iniciar con cuenta SYSGD
						</Button>
					</StartModeCard>

					<StartModeCard
						icon={<FileJson className="size-6" />}
						title="Iniciar desde copia de seguridad"
						description="Selecciona un archivo .json exportado por la app para visualizarlo y trabajar con él en este equipo."
						footer="El archivo no se sube a ningún servidor."
					>
						<div className="space-y-2">
							<input
								ref={fileRef}
								type="file"
								accept=".json"
								className="hidden"
								onChange={(e) => {
									handleFileChange(e.target.files?.[0]);
									e.target.value = "";
								}}
							/>
							<Button
								type="button"
								variant="outline"
								className="w-full"
								onClick={handlePickFile}
							>
								{backupName ?? "Seleccionar archivo JSON"}
							</Button>
							{validation.msg && (
								<p
									className={
										validation.ok
											? "text-xs text-emerald-600 dark:text-emerald-400"
											: "text-xs text-red-600 dark:text-red-400"
									}
								>
									{validation.msg}
								</p>
							)}
							<Button
								type="button"
								className="w-full"
								disabled={!validation.ok || openingBackup}
								onClick={() => void handleOpenBackup()}
							>
								{openingBackup && <Loader2 className="size-4 animate-spin" />}
								{openingBackup ? "Abriendo…" : "Abrir y trabajar"}
							</Button>
						</div>
					</StartModeCard>

					<StartModeCard
						icon={<Smartphone className="size-6" />}
						title="Vincular con el teléfono"
						description="Genera un link de un solo uso en el teléfono (Más → Vincular PC) y pégalo aquí. Los datos quedan en esta PC para trabajar offline."
						footer="La PC y el teléfono deben estar en el mismo Wi-Fi."
					>
						<Button
							type="button"
							variant="outline"
							className="w-full"
							disabled={importingLink}
							onClick={() => setLinkOpen(true)}
						>
							{importingLink ? "Importando…" : "Pegar link del teléfono"}
						</Button>
					</StartModeCard>
				</div>

				<p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
					El flujo de compra y activación de licencias queda reservado para el futuro y
					no bloquea ninguna de estas formas de inicio.
				</p>
			</div>

			<VincularLanDialog
				open={linkOpen}
				onOpenChange={setLinkOpen}
				tituloConfirmar="Importar y entrar"
				onDatos={(datos) => {
					void handleLinkData(datos);
				}}
			/>
		</div>
	);
};

export default StartModeScreen;
