import { type FC, useState } from "react";
import { Check, Globe, Plus, RefreshCw, Server, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useServer } from "@/contexts/ServerContext";

interface ServerSettingsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const ServerSettingsDialog: FC<ServerSettingsDialogProps> = ({
	open,
	onOpenChange,
}) => {
	const {
		serverUrl,
		accounts,
		activeAccount,
		setServerUrl,
		switchAccount,
		addAccount,
		removeAccount,
		testServer,
	} = useServer();

	const [newServerUrl, setNewServerUrl] = useState("");
	const [newAccountName, setNewAccountName] = useState("");
	const [testing, setTesting] = useState(false);
	const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);
	const [saving, setSaving] = useState(false);

	const handleTest = async () => {
		if (!newServerUrl.trim()) return;
		setTesting(true);
		setTestResult(null);
		const ok = await testServer(newServerUrl);
		setTestResult(ok ? "ok" : "fail");
		setTesting(false);
	};

	const handleSave = () => {
		if (!newServerUrl.trim()) return;
		setSaving(true);
		setServerUrl(newServerUrl);
		setSaving(false);
		onOpenChange(false);
	};

	const handleAddAccount = () => {
		if (!newAccountName.trim() || !newServerUrl.trim()) return;
		addAccount({
			name: newAccountName.trim(),
			serverUrl: newServerUrl.trim(),
			email: "",
		});
		setNewAccountName("");
		setNewServerUrl("");
	};

	const handleQuickSwitch = (accountId: string) => {
		switchAccount(accountId);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Server className="size-5" />
						Configuración del servidor
					</DialogTitle>
					<DialogDescription>
						Define a qué servidor se conecta la app. Puedes guardar varias
						cuentas y cambiar entre ellas.
					</DialogDescription>
				</DialogHeader>

				{/* Servidor actual */}
				<div className="space-y-2">
					<Label>Servidor actual</Label>
					<div className="rounded-md bg-slate-100 p-3 dark:bg-slate-800">
						<p className="font-mono text-sm text-slate-700 dark:text-slate-300">
							{serverUrl}
						</p>
						{activeAccount && (
							<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
								Cuenta: {activeAccount.name} ({activeAccount.email || "sin email"})
							</p>
						)}
					</div>
				</div>

				{/* Cambiar servidor */}
				<div className="space-y-2">
					<Label htmlFor="new-server">Cambiar servidor</Label>
					<div className="flex gap-2">
						<Input
							id="new-server"
							placeholder="https://tu-servidor.com"
							value={newServerUrl}
							onChange={(e) => {
								setNewServerUrl(e.target.value);
								setTestResult(null);
							}}
						/>
						<Button
							type="button"
							variant="outline"
							size="icon"
							disabled={testing || !newServerUrl.trim()}
							onClick={() => void handleTest()}
						>
							{testing ? (
								<RefreshCw className="size-4 animate-spin" />
							) : (
								<Globe className="size-4" />
							)}
						</Button>
					</div>
					{testResult === "ok" && (
						<p className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
							<Check className="size-3" /> Servidor accesible
						</p>
					)}
					{testResult === "fail" && (
						<p className="text-xs text-red-600 dark:text-red-400">
							No se pudo conectar con ese servidor
						</p>
					)}
					<Button
						type="button"
						className="w-full"
						disabled={saving || !newServerUrl.trim()}
						onClick={() => void handleSave()}
					>
						{saving ? "Guardando..." : "Aplicar servidor"}
					</Button>
				</div>

				{/* Cuentas guardadas */}
				<div className="space-y-2">
					<Label>Cuentas guardadas</Label>
					{accounts.length === 0 ? (
						<p className="text-xs text-slate-500 dark:text-slate-400">
							Sin cuentas guardadas. Añade una para cambiar rápidamente.
						</p>
					) : (
						<div className="space-y-1">
							{accounts.map((acc) => (
								<div
									key={acc.id}
									className={`flex items-center justify-between rounded-md border p-2 ${
										activeAccount?.id === acc.id
											? "border-cyan-500 bg-cyan-500/10"
											: "border-slate-200 dark:border-slate-700"
									}`}
								>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
											{acc.name}
										</p>
										<p className="truncate text-xs text-slate-500 dark:text-slate-400">
											{acc.serverUrl}
										</p>
									</div>
									<div className="flex shrink-0 items-center gap-1">
										{activeAccount?.id !== acc.id && (
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => handleQuickSwitch(acc.id)}
											>
												Usar
											</Button>
										)}
										<Button
											type="button"
											variant="ghost"
											size="icon"
											onClick={() => removeAccount(acc.id)}
										>
											<Trash2 className="size-3.5 text-red-500" />
										</Button>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Añadir cuenta */}
				<div className="space-y-2">
					<Label htmlFor="new-account-name">Añadir cuenta</Label>
					<div className="flex gap-2">
						<Input
							id="new-account-name"
							placeholder="Nombre (ej. Servidor de casa)"
							value={newAccountName}
							onChange={(e) => setNewAccountName(e.target.value)}
						/>
						<Button
							type="button"
							variant="outline"
							size="icon"
							disabled={!newAccountName.trim() || !newServerUrl.trim()}
							onClick={handleAddAccount}
						>
							<Plus className="size-4" />
						</Button>
					</div>
					<p className="text-xs text-slate-500 dark:text-slate-400">
						La cuenta se guarda con el servidor actual. Para añadir una, primero
						define un servidor arriba.
					</p>
				</div>

				{/* Cerrar */}
				<Button
					type="button"
					variant="ghost"
					className="w-full"
					onClick={() => onOpenChange(false)}
				>
					<X className="size-4" /> Cerrar
				</Button>
			</DialogContent>
		</Dialog>
	);
};

export default ServerSettingsDialog;
