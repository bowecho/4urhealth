import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/(app)/settings/export/route";

const { requireUserId, db } = vi.hoisted(() => ({
	requireUserId: vi.fn(),
	db: {
		select: vi.fn(),
	},
}));

vi.mock("@/lib/auth-server", () => ({
	requireUserId,
}));

vi.mock("@/db", () => ({
	db,
}));

function makeOrderedSelectChain<T>(result: T) {
	const orderBy = vi.fn().mockResolvedValue(result);
	const where = vi.fn(() => ({ orderBy }));
	return {
		from: vi.fn(() => ({ where })),
		orderBy,
		where,
	};
}

function makeJoinedOrderedSelectChain<T>(result: T) {
	const orderBy = vi.fn().mockResolvedValue(result);
	const where = vi.fn(() => ({ orderBy }));
	const innerJoin = vi.fn(() => ({ innerJoin, where }));
	return {
		from: vi.fn(() => ({ innerJoin })),
		innerJoin,
		orderBy,
		where,
	};
}

describe("settings export route", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		requireUserId.mockResolvedValue("user-1");
	});

	it("exports foods, meals, meal logs, and weights as JSON", async () => {
		db.select
			.mockReturnValueOnce(
				makeOrderedSelectChain([
					{
						id: "food-1",
						name: "Greek Yogurt",
						brand: "Fage",
						servingSize: "1",
						servingUnit: "container",
						calories: 130,
						proteinG: "23",
						fatG: "0",
						carbsG: "9",
						archivedAt: null,
					},
				]),
			)
			.mockReturnValueOnce(
				makeOrderedSelectChain([
					{
						date: "2026-04-20",
						weightLbs: "205.4",
						note: "post-workout",
					},
				]),
			)
			.mockReturnValueOnce(
				makeOrderedSelectChain([{ id: "meal-1", name: "Breakfast Bowl" }]),
			)
			.mockReturnValueOnce(
				makeJoinedOrderedSelectChain([
					{
						savedMealId: "meal-1",
						foodId: "food-1",
						foodBrand: "Fage",
						servings: "1.5",
						sortOrder: 0,
						foodName: "Greek Yogurt",
					},
				]),
			)
			.mockReturnValueOnce(
				makeOrderedSelectChain([
					{
						id: "log-1",
						date: "2026-04-20",
						mealType: "breakfast",
					},
				]),
			)
			.mockReturnValueOnce(
				makeJoinedOrderedSelectChain([
					{
						mealLogId: "log-1",
						foodId: "food-1",
						servings: "1.5",
						sortOrder: 0,
						nameSnapshot: "Greek Yogurt",
						caloriesSnapshot: 195,
						proteinGSnapshot: "34.5",
						fatGSnapshot: "0.0",
						carbsGSnapshot: "13.5",
					},
				]),
			);

		const response = await GET();
		const payload = await response.json();

		expect(response.headers.get("Content-Type")).toBe("application/json");
		expect(response.headers.get("Content-Disposition")).toContain(
			'attachment; filename="4urhealth-',
		);
		expect(payload.foods).toEqual([
			{
				id: "food-1",
				name: "Greek Yogurt",
				brand: "Fage",
				servingSize: 1,
				servingUnit: "container",
				calories: 130,
				proteinG: 23,
				fatG: 0,
				carbsG: 9,
				archivedAt: null,
			},
		]);
		expect(payload.savedMeals).toEqual([
			{
				name: "Breakfast Bowl",
				items: [
					{
						foodId: "food-1",
						foodName: "Greek Yogurt",
						foodBrand: "Fage",
						servings: 1.5,
					},
				],
			},
		]);
		expect(payload.mealLogs).toEqual([
			{
				date: "2026-04-20",
				mealType: "breakfast",
				items: [
					{
						foodId: "food-1",
						foodName: "Greek Yogurt",
						servings: 1.5,
						calories: 195,
						proteinG: 34.5,
						fatG: 0,
						carbsG: 13.5,
					},
				],
			},
		]);
		expect(payload.weights).toEqual([
			{
				date: "2026-04-20",
				weightLbs: 205.4,
				note: "post-workout",
			},
		]);
	});
});
