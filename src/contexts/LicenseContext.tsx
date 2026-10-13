import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

// ─── TIPOS ────────────────────────────────────────────────────────────────────
export type LicenseTier = "monthly" | "quarterly" | "annual";

export interface LicensePayload {
  machineId: string;
  email: string;
  tier: LicenseTier;
  issuedAt: number;
  expiresAt: number;
}

export interface LicenseState {
  payload: LicensePayload | null;
  activatedAt: string | null;
}

type SetupStep = "welcome" | "setup-account" | "license" | "complete";

interface LicenseContextType {
  // Estado
  license: LicenseState | null;
  isLoading: boolean;
  setupStep: SetupStep;
  setSetupStep: (step: SetupStep) => void;
  hasLicense: boolean;
  hasAccount: boolean;
  localAccount: { name: string; email: string } | null;
  setLocalAccount: (account: { name: string; email: string } | null) => void;
  daysRemaining: number | null;
  tier: LicenseTier | null;

  // Acciones
  // Genera el requestCode para mostrar al usuario (paso 1 del flujo)
  generateRequestCode: () => Promise<string>;
  // Activa la licencia con la key que el usuario copió de la web (paso 2)
  activateLicense: (key: string) => Promise<{ success: boolean; error?: string }>;
  clearLicense: () => Promise<void>;
}

const LicenseContext = createContext<LicenseContextType | null>(null);

// ─── PROVIDER ─────────────────────────────────────────────────────────────────
export function LicenseProvider({ children }: { children: ReactNode }) {
  const [license, setLicense] = useState<LicenseState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [setupStep, setSetupStep] = useState<SetupStep>("welcome");
  const [localAccount, setLocalAccountState] = useState<{
    name: string;
    email: string;
  } | null>(null);

  const hasLicense = license !== null && license.payload !== null;
  const hasAccount = localAccount !== null;

  const daysRemaining = license?.payload
    ? Math.max(
        0,
        Math.ceil(
          (license.payload.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)
        )
      )
    : null;

  const tier = license?.payload?.tier ?? null;

  // ── Verificar licencia al montar ───────────────────────────────────────────
  // NOTA (2026-10): flujo de compra/activación en pausa por decisión de producto.
  // Se conserva todo el código de licencias para el futuro, pero no bloquea el inicio.
  useEffect(() => {
    async function init() {
      try {
        // Restaurar cuenta local guardada (sigue útil para modos backup/teléfono)
        const savedAccount = localStorage.getItem("sysgd_local_account");
        if (savedAccount) {
          setLocalAccountState(JSON.parse(savedAccount));
        }
      } catch (error) {
        console.error("Error restaurando cuenta local:", error);
      } finally {
        // Sin bloqueo por licencia: siempre completo hasta reactivar el flujo.
        setSetupStep("complete");
        setIsLoading(false);
      }
    }

    init();
  }, []);

  // ── Generar request code ───────────────────────────────────────────────────
  const generateRequestCode = async (): Promise<string> => {
    if (!window.electronAPI) {
      throw new Error("Solo disponible en la aplicación de escritorio");
    }
    return window.electronAPI.generateRequestCode();
  };

  // ── Activar licencia ───────────────────────────────────────────────────────
  // Recibe la licenseKey que el usuario copió de la web.
  // La verifica localmente con la clave pública RSA — sin internet.
  const activateLicense = async (
    key: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!window.electronAPI) {
      return { success: false, error: "Electron API no disponible" };
    }

    try {
      const result = await window.electronAPI.activateLicense(key.trim());

      if (result.valid && result.payload) {
        setLicense({ payload: result.payload, activatedAt: new Date().toISOString() });
        setSetupStep("complete");
        return { success: true };
      }

      return { success: false, error: result.error ?? "Licencia inválida" };
    } catch (error) {
      console.error("Error activating license:", error);
      return { success: false, error: "Error al activar la licencia" };
    }
  };

  // ── Limpiar licencia ───────────────────────────────────────────────────────
  const clearLicense = async () => {
    if (!window.electronAPI) return;
    await window.electronAPI.clearLicense();
    setLicense(null);
    setSetupStep("welcome");
  };

  // ── Persistir cuenta local ─────────────────────────────────────────────────
  const setLocalAccount = (
    account: { name: string; email: string } | null
  ) => {
    setLocalAccountState(account);
    if (account) {
      localStorage.setItem("sysgd_local_account", JSON.stringify(account));
    } else {
      localStorage.removeItem("sysgd_local_account");
    }
  };

  return (
    <LicenseContext.Provider
      value={{
        license,
        isLoading,
        setupStep,
        setSetupStep,
        hasLicense,
        hasAccount,
        localAccount,
        setLocalAccount,
        daysRemaining,
        tier,
        generateRequestCode,
        activateLicense,
        clearLicense,
      }}
    >
      {children}
    </LicenseContext.Provider>
  );
}

// ─── HOOK ─────────────────────────────────────────────────────────────────────
export function useLicense() {
  const context = useContext(LicenseContext);
  if (!context) {
    // Fuera de Electron (navegador web): valores por defecto — app siempre activa
    return {
      license: null,
      isLoading: false,
      setupStep: "complete" as SetupStep,
      setSetupStep: () => {},
      hasLicense: true,          // en la web no necesita licencia
      hasAccount: false,
      localAccount: null,
      setLocalAccount: () => {},
      daysRemaining: null,
      tier: null,
      generateRequestCode: async () => { throw new Error("Solo en Electron"); },
      activateLicense: async () => ({ success: false, error: "Solo en Electron" }),
      clearLicense: async () => {},
    };
  }
  return context;
}