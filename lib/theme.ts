export const THEME_COOKIE_NAME = "theme-preference";

export const THEME_COLORS = {
	light: "#fafafa",
	dark: "#0a0a0a",
} as const;

export type ThemePreference = "light" | "dark";

export function isThemePreference(
	value: string | null | undefined,
): value is ThemePreference {
	return value === "light" || value === "dark";
}

export function resolveThemePreference(
	value: string | null | undefined,
): ThemePreference | null {
	return isThemePreference(value) ? value : null;
}

export const THEME_BOOTSTRAP_SCRIPT = `(() => {
	const root = document.documentElement;
	if (root.dataset.themePreference) return;
	const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
	root.classList.toggle("dark", isDark);
	root.style.colorScheme = isDark ? "dark" : "light";
})();`;
