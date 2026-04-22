import { describe, expect, it } from "vitest";
import {
	addDays,
	formatFriendlyDate,
	isIsoDate,
	isValidTimeZone,
	todayInTz,
} from "./date";

describe("isIsoDate", () => {
	it("accepts YYYY-MM-DD", () => {
		expect(isIsoDate("2026-04-19")).toBe(true);
	});
	it("rejects other formats", () => {
		expect(isIsoDate("2026/04/19")).toBe(false);
		expect(isIsoDate("apr 19")).toBe(false);
		expect(isIsoDate("")).toBe(false);
	});
});

describe("addDays", () => {
	it("advances by one day", () => {
		expect(addDays("2026-04-19", 1)).toBe("2026-04-20");
	});
	it("goes back one day", () => {
		expect(addDays("2026-04-19", -1)).toBe("2026-04-18");
	});
	it("crosses months", () => {
		expect(addDays("2026-04-30", 1)).toBe("2026-05-01");
	});
	it("crosses years", () => {
		expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
	});
});

describe("todayInTz", () => {
	it("uses the provided timezone instead of UTC", () => {
		const now = new Date("2026-04-19T00:30:00.000Z");
		expect(todayInTz("America/Chicago", now)).toBe("2026-04-18");
		expect(todayInTz("Asia/Tokyo", now)).toBe("2026-04-19");
	});

	it("falls back to UTC for invalid timezones", () => {
		const now = new Date("2026-04-19T00:30:00.000Z");
		expect(todayInTz("America/Definitely-Not-Real", now)).toBe("2026-04-19");
	});
});

describe("isValidTimeZone", () => {
	it("accepts real IANA zones", () => {
		expect(isValidTimeZone("America/Chicago")).toBe(true);
	});

	it("rejects invalid zones", () => {
		expect(isValidTimeZone("CST")).toBe(false);
		expect(isValidTimeZone("America/Definitely-Not-Real")).toBe(false);
	});
});

describe("formatFriendlyDate", () => {
	it("returns Today for same date", () => {
		expect(formatFriendlyDate("2026-04-19", "2026-04-19")).toBe("Today");
	});
	it("returns Yesterday / Tomorrow", () => {
		expect(formatFriendlyDate("2026-04-18", "2026-04-19")).toBe("Yesterday");
		expect(formatFriendlyDate("2026-04-20", "2026-04-19")).toBe("Tomorrow");
	});
	it("falls back to weekday + month + day", () => {
		const out = formatFriendlyDate("2026-04-15", "2026-04-19");
		expect(out).toMatch(/Apr/);
		expect(out).toMatch(/15/);
	});
});
