import { describe, expect, it } from "vitest";
import { parseRequiredNumber } from "./form";

describe("parseRequiredNumber", () => {
	it("parses valid numbers", () => {
		expect(parseRequiredNumber("12.5", "Weight")).toBe(12.5);
		expect(parseRequiredNumber("0", "Calories")).toBe(0);
	});

	it("rejects blank values", () => {
		expect(() => parseRequiredNumber("   ", "Height")).toThrow(
			"Height is required",
		);
	});

	it("rejects invalid values", () => {
		expect(() => parseRequiredNumber("abc", "Protein")).toThrow(
			"Protein is invalid",
		);
	});
});
