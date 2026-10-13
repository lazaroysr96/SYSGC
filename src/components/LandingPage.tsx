import {
  ArrowRight,
  Building2,
  Github,
  Mail,
  MapPin,
  Rocket,
  Sparkles,
  Twitter,
} from "lucide-react";
import { IoLogoWhatsapp } from "react-icons/io5";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isCapacitorMode, isDesktopMode } from "@/gctcp/data/getLedgerRepository";

// PC y móvil entran directo al workspace (offline-first); la web pura pasa por login.
const DESKTOP_ENTRY_URL = isDesktopMode() || isCapacitorMode() ? "/gctcp" : "/login";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-blend-hue bg-slate-900 text-white">
      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <div className="nebula2 pointer-events-none" />
      </div>

      <div className="bg-image md:block absolute hidden  h-screen">
        <img className="md:h-screen " src="bg.jpeg" alt="Fondo de pantalla" />
      </div>

      {/* Navigation */}

      {/* Hero Section */}
	  <div className="flex h-screen">
      <section className="flex-1 relative z-10 py-20 px-4 sm:px-6 flex flex-col items-center justify-center lg:px-8 min-h-screen">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8 block md:hidden">
            <img
              src="bg.jpeg"
              alt="SYSGD Logo"
              className="h-32 rounded overflow-hidden mx-auto mb-6 drop-shadow-2xl"
            />
          </div>
          <Badge className="mb-6 bg-linear-to-r from-cyan-500/20 to-blue-500/20 border-cyan-400/30 text-cyan-300">
            <Sparkles className="w-4 h-4 mr-2" />
            Ecosistema Tecnológico en Expansión
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-6">
            Sistema de Gestión Contable Para
            <br />
            <span className="bg-linear-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              TCP y  MIPYMES
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-4xl mx-auto leading-relaxed">
            SYSGD es más que software, es un{" "}
            <strong className="text-cyan-400">
              ecosistema tecnológico completo
            </strong>{" "}
            que evoluciona con tu empresa. Desde gestión documental, gestión de
            proyectos, hasta gestión contable.
            <br />
            <span className="text-cyan-300">
              Una plataforma. Infinitas posibilidades.
            </span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button
              size="lg"
              className="bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-lg px-8 py-4"
              asChild
            >
              <Link to={DESKTOP_ENTRY_URL}>
                <Rocket className="w-5 h-5 mr-2" />
                Entrar
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
	  <section className="hidden md:block flex-1"></section>
		</div>
      {/* Footer */}
      <footer
        id="contact"
        className="relative z-10 bg-slate-900/80 backdrop-blur-md border-t border-cyan-500/20 py-12 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-linear-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="text-xl font-bold bg-linear-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    SYSGD
                  </span>
                  <div className="text-xs text-cyan-400">Ecosystem</div>
                </div>
              </div>
              <p className="text-gray-400 mb-4">
                El ecosistema tecnológico más avanzado para la gestión
                empresarial del futuro.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-cyan-400"
                >
                  <Link
                    target="_blank"
                    to="https://github.com/lazaroysr96/sysgd/"
                  >
                    <Github className="w-4 h-4" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-cyan-400"
                >
                  <Link target="_blank" to="https://x.com/SYSGD_">
                    <Twitter className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4 text-cyan-400">Soporte</h3>
              <div className="space-y-2 text-sm text-gray-400">
                {/* <div>Documentación</div>
								<div>Centro de ayuda</div>
								<div>API Reference</div>
								<div>Estado del servicio</div> */}
                <div>
                  <Link to="/terms">Términos y Condiciones</Link>
                </div>
                <div>
                  <Link to="/privacy">Plítica de Privacidad</Link>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-cyan-400">Contacto</h3>
              <div className="space-y-2 text-sm text-gray-400">
                <Link
                  className="flex items-center gap-2"
                  to="mailto:support@ecosysgd.com"
                >
                  <Mail className="w-4 h-4" />
                  support@ecosysgd.com
                </Link>
                <Link
                  target="_blank"
                  className="flex items-center gap-2"
                  to="https://wa.me/+5351158544"
                >
                  <IoLogoWhatsapp className="w-4 h-4" />
                  +53 51158544
                </Link>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Las Tunas, Cuba
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-700 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2025 SYSGD Ecosystem. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
