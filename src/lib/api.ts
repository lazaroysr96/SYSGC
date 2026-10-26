import axios from "axios";

let baseURL =
	typeof import.meta !== "undefined"
		? (import.meta.env.VITE_SERVER_URL ?? "https://sysgd-production.up.railway.app")
		: "https://sysgd-production.up.railway.app";

const api = axios.create({
	baseURL,
	withCredentials: true,
});

export function setApiBaseUrl(url: string) {
	baseURL = url;
	api.defaults.baseURL = url;
}

export function getApiBaseUrl(): string {
	return baseURL;
}

api.interceptors.request.use((config) => {
	const token = localStorage.getItem("token");
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

api.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response?.status === 401) {
			localStorage.removeItem("token");
			console.warn("No autorizado — quizás el token ha expirado", error);
		}
		return Promise.reject(error);
	},
);

export default api;
