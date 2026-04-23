import { beforeEach, describe, expect, it, vi } from "vitest";

const { notFound, redirect, requireAppPageContext, isIsoDate } = vi.hoisted(
	() => ({
		notFound: vi.fn(() => {
			throw new Error("not-found");
		}),
		redirect: vi.fn((to: string) => {
			throw new Error(`redirect:${to}`);
		}),
		requireAppPageContext: vi.fn(),
		isIsoDate: vi.fn(),
	}),
);

vi.mock("next/navigation", () => ({
	notFound,
	redirect,
}));

vi.mock("@/lib/app-page", () => ({
	requireAppPageContext,
}));

vi.mock("@/lib/date", () => ({
	isIsoDate,
}));

vi.mock("@/components/day-view", () => ({
	DayView: ({ date, today }: { date: string; today: string }) => (
		<div data-date={date} data-today={today} />
	),
}));

describe("day-related pages", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		requireAppPageContext.mockResolvedValue({ today: "2026-04-22" });
		isIsoDate.mockReturnValue(true);
	});

	it("renders today page with today's date", async () => {
		const { default: TodayPage } = await import("@/app/(app)/page");

		const page = await TodayPage();

		expect(page.props.date).toBe("2026-04-22");
		expect(page.props.today).toBe("2026-04-22");
	});

	it("rejects invalid day params", async () => {
		isIsoDate.mockReturnValue(false);
		const { default: DayPage } = await import("@/app/(app)/day/[date]/page");

		await expect(
			DayPage({
				params: Promise.resolve({ date: "04-22-2026" }),
			} as PageProps<"/day/[date]">),
		).rejects.toThrow("not-found");
		expect(notFound).toHaveBeenCalled();
	});

	it("redirects canonical today URLs back to root", async () => {
		const { default: DayPage } = await import("@/app/(app)/day/[date]/page");

		await expect(
			DayPage({
				params: Promise.resolve({ date: "2026-04-22" }),
			} as PageProps<"/day/[date]">),
		).rejects.toThrow("redirect:/");
		expect(redirect).toHaveBeenCalledWith("/");
	});

	it("renders a historical day when the date is valid and not today", async () => {
		const { default: DayPage } = await import("@/app/(app)/day/[date]/page");

		const page = await DayPage({
			params: Promise.resolve({ date: "2026-04-21" }),
		} as PageProps<"/day/[date]">);

		expect(page.props.date).toBe("2026-04-21");
		expect(page.props.today).toBe("2026-04-22");
	});
});
