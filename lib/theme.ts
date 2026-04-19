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
