import { useEffect } from "react"; // 1. Importamos useEffect
import { useNavigate } from "react-router-dom";
import { useGcTcpAuth } from "@/gctcp/hooks/useGcTcpAuth";
import Loading from "./Loading";
import { TopNavigation } from "./TopNavigationDashboard";
import GC_TCP from "@/gctcp/GC_TCP";

function MainPage() {
	const navigate = useNavigate();
	const { user, loading, desktopMode } = useGcTcpAuth();

	// 2. Manejamos la redirección como un efecto secundario.
	// En modo escritorio (offline) no se exige sesión de servidor.
	useEffect(() => {
		if (!desktopMode && !loading && !user) {
			navigate("/login");
		}
	}, [user, loading, navigate, desktopMode]);

	if (loading) {
		return (
			<div className="flex flex-col h-screen bg-slate-950 items-center justify-center">
				<Loading />
			</div>
		);
	}

	// 3. Si no hay usuario retornamos null mientras el useEffect hace su trabajo
	if (!user) {
		return null;
	}

	const handleHomeClick = () => {
		navigate("/");
	};

	return (
		<div className="min-h-screen bg-gray-100 dark:bg-gray-900">
			<TopNavigation onHomeClick={handleHomeClick} />
			<GC_TCP/>
		</div>
	);
}

export default function Page() {
	return <MainPage />;
}
