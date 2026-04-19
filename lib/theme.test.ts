import { describe, expect, it } from "vitest";
import { resolveThemePreference } from "./theme";

describe("resolveThemePreference", () => {
	it("accepts supported theme values", () => {
		expect(resolveThemePreference("light")).toBe("light");
		expect(resolveThemePreference("dark")).toBe("dark");
	});

	it("rejects unsupported values", () => {
		expect(resolveThemePreference("system")).toBeNull();
		expect(resolveThemePreference("")).toBeNull();
		expect(resolveThemePreference(undefined)).toBeNull();
	});
});
