import { render, screen } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DayView } from "@/components/day-view";

const { requireUserId, db, DayTotals, MealCard, addDays, formatFriendlyDate } =
	vi.hoisted(() => ({
		requireUserId: vi.fn(),
		db: { select: vi.fn() },
		DayTotals: vi.fn(() => <div data-testid="day-totals" />),
		MealCard: vi.fn(() => <section data-testid="meal-card" />),
		addDays: vi.fn(),
		formatFriendlyDate: vi.fn(),
	}));

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		...props
	}: {
		href: string;
		children: React.ReactNode;
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

vi.mock("@/lib/auth-server", () => ({
	requireUserId,
}));

vi.mock("@/db", () => ({
	db,
}));

vi.mock("@/components/day-totals", () => ({
	DayTotals,
}));

vi.mock("@/components/meal-card", () => ({
	MealCard,
}));

vi.mock("@/lib/date", async () => {
	const actual =
		await vi.importActual<typeof import("@/lib/date")>("@/lib/date");
	return {
		...actual,
		addDays,
		formatFriendlyDate,
	};
});

function makeLimitChain<T>(result: T) {
	const limit = vi.fn().mockResolvedValue(result);
	const where = vi.fn(() => ({ limit }));
	return { from: vi.fn(() => ({ where })) };
}

function makeOrderChain<T>(result: T) {
	const orderBy = vi.fn().mockResolvedValue(result);
	const where = vi.fn(() => ({ orderBy }));
	return { from: vi.fn(() => ({ where })) };
}

function makeJoinOrderChain<T>(result: T) {
	const orderBy = vi.fn().mockResolvedValue(result);
	const where = vi.fn(() => ({ orderBy }));
	const innerJoin = vi.fn(() => ({ where }));
	return { from: vi.fn(() => ({ innerJoin })) };
}

describe("DayView", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		requireUserId.mockResolvedValue("user-1");
		addDays.mockImplementation((_date: string, delta: number) =>
			delta < 0 ? "2026-04-22" : "2026-04-24",
		);
		formatFriendlyDate.mockReturnValue("Friendly Wednesday");
	});

	it("loads totals, groups meal items by meal type, and renders prev/next links", async () => {
		db.select
			.mockReturnValueOnce(
				makeLimitChain([
					{
						targetCalories: 2200,
						targetProteinG: 180,
						targetFatG: 70,
						targetCarbsG: 200,
					},
				]),
			)
			.mockReturnValueOnce(
				makeJoinOrderChain([
					{
						itemId: "item-1",
						foodItemId: "food-1",
						servings: "2",
						name: "Greek Yogurt",
						calories: 130,
						proteinG: "23",
						fatG: "0",
						carbsG: "9",
						sortOrder: 0,
						createdAt: new Date("2026-04-23T12:00:00.000Z"),
						mealType: "breakfast",
					},
					{
						itemId: "item-2",
						foodItemId: null,
						servings: "1",
						name: "Apple",
						calories: 95,
						proteinG: "0.5",
						fatG: "0.3",
						carbsG: "25",
						sortOrder: 1,
						createdAt: new Date("2026-04-23T13:00:00.000Z"),
						mealType: "snack",
					},
				]),
			)
			.mockReturnValueOnce(
				makeOrderChain([
					{
						id: "food-1",
						name: "Greek Yogurt",
						brand: "Fage",
						servingSize: "1",
						servingUnit: "cup",
						calories: 130,
						proteinG: "23",
						fatG: "0",
						carbsG: "9",
					},
				]),
			);

		render(await DayView({ date: "2026-04-23", today: "2026-04-22" }));

		expect(requireUserId).toHaveBeenCalled();
		expect(
			screen.getByRole("heading", { name: "Friendly Wednesday" }),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Previous day" })).toHaveAttribute(
			"href",
			"/",
		);
		expect(screen.getByRole("link", { name: "Next day" })).toHaveAttribute(
			"href",
			"/day/2026-04-24",
		);

		expect(DayTotals).toHaveBeenCalledWith(
			expect.objectContaining({
				totals: {
					calories: 225,
					proteinG: 23.5,
					fatG: 0.3,
					carbsG: 34,
				},
				targets: {
					calories: 2200,
					proteinG: 180,
					fatG: 70,
					carbsG: 200,
				},
			}),
			undefined,
		);

		expect(MealCard).toHaveBeenCalledTimes(4);
		expect(MealCard).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				date: "2026-04-23",
				mealType: "breakfast",
				label: "Breakfast",
				items: [
					{
						id: "item-1",
						foodItemId: "food-1",
						servings: 2,
						name: "Greek Yogurt",
						calories: 130,
						proteinG: 23,
						fatG: 0,
						carbsG: 9,
					},
				],
				foods: [
					{
						id: "food-1",
						name: "Greek Yogurt",
						brand: "Fage",
						servingSize: 1,
						servingUnit: "cup",
						calories: 130,
						proteinG: 23,
						fatG: 0,
						carbsG: 9,
					},
				],
			}),
			undefined,
		);
		expect(MealCard).toHaveBeenNthCalledWith(
			4,
			expect.objectContaining({
				mealType: "snack",
				label: "Snacks",
				items: [
					{
						id: "item-2",
						foodItemId: null,
						servings: 1,
						name: "Apple",
						calories: 95,
						proteinG: 0.5,
						fatG: 0.3,
						carbsG: 25,
					},
				],
			}),
			undefined,
		);
	});
});
