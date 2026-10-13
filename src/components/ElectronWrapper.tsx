import type React from "react";
import { useEffect, useState } from "react";
import { TitleBar } from "./TitleBar";
import { LicenseProvider, useLicense } from "@/contexts/LicenseContext";
import { StartupProvider, useStartup } from "@/contexts/StartupContext";
import StartModeScreen from "@/screens/StartModeScreen";

// Detección robusta del entorno
const isElectron = () => {
	return (
		!!window?.process?.versions?.electron ||
		!!window?.electronAPI ||
		navigator.userAgent.toLowerCase().indexOf("electron") > -1
	);
};

interface ElectronWrapperProps {
	children: React.ReactNode;
}

function ElectronContent({ children }: ElectronWrapperProps) {
	const { isLoading: licenseLoading } = useLicense();
	const { isLoading: startupLoading, isStarted } = useStartup();

	// Mostrar loading mientras se resuelve el modo de inicio
	if (licenseLoading || startupLoading) {
		return (
			<div className="h-screen flex items-center justify-center bg-slate-900">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
			</div>
		);
	}

	// Sin modo de inicio elegido: mostrar las 3 formas de entrar (nube / backup / teléfono).
	// El flujo de licencias queda en pausa y no bloquea.
	if (!isStarted && window.electronAPI) {
		return (
			<div className="h-screen flex flex-col overflow-hidden">
				<TitleBar />
				<div className="flex-1 w-full overflow-y-auto relative z-10">
					<StartModeScreen />
				</div>
			</div>
		);
	}

	// Inicio completo, mostrar la app normal
	return (
		<div className="h-screen flex flex-col overflow-hidden">
			<TitleBar />
			<div className="flex-1 w-full overflow-y-auto relative z-10">
				{children}
			</div>
		</div>
	);
}

export const ElectronWrapper: React.FC<ElectronWrapperProps> = ({
	children,
}) => {
	const [isElectronEnv, setIsElectronEnv] = useState(false);

	useEffect(() => {
		setIsElectronEnv(isElectron());
	}, []);

	// Si no estamos en Electron, exponer Startup igual (para /inicio en web) sin bloquear.
	if (!isElectronEnv) {
		return (
			<StartupProvider>
				<div className="h-screen relative">{children}</div>
			</StartupProvider>
		);
	}

	// En Electron: Startup decide la puerta de entrada. LicenseProvider se conserva
	// para el futuro flujo de compra/activación, pero ya no bloquea.
	return (
		<StartupProvider>
			<LicenseProvider>
				<ElectronContent>{children}</ElectronContent>
			</LicenseProvider>
		</StartupProvider>
	);
};
