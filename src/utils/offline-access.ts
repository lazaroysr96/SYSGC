
import type { Task } from "@/types/Task";
import type { User } from "@/types/user";

export const PROJECTS_CACHE_KEY = "projects-cache";
export const USER_CACHE_KEY = "current-user-cache";

interface TasksCachePayload {
	tasks: Task[];
	updatedAt: number;
}

export const hasAuthToken = () => Boolean(localStorage.getItem("token"));

export const readCachedUser = (): User | null => {
	try {
		const raw = localStorage.getItem(USER_CACHE_KEY);
		if (!raw) return null;
		return JSON.parse(raw) as User;
	} catch {
		return null;
	}
};

export const writeCachedUser = (user: User) => {
	localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
};

export const hasTasksCache = () => {
	try {
		for (let index = 0; index < localStorage.length; index += 1) {
			const key = localStorage.key(index);
			if (!key || !key.startsWith("tasks-cache:")) continue;
			const raw = localStorage.getItem(key);
			if (!raw) continue;
			const parsed = JSON.parse(raw) as TasksCachePayload;
			if (Array.isArray(parsed?.tasks) && parsed.tasks.length > 0) {
				return true;
			}
		}
		return false;
	} catch {
		return false;
	}
};

export const canContinueOffline = () =>
	hasAuthToken() && hasTasksCache() && Boolean(readCachedUser());
