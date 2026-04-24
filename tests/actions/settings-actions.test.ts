import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	importDataAction,
	saveProfileAction,
} from "@/app/(app)/settings/actions";

const { revalidatePath, requireUserId, cookies, db } = vi.hoisted(() => ({
	revalidatePath: vi.fn(),
	requireUserId: vi.fn(),
	cookies: vi.fn(),
	db: {
		update: vi.fn(),
		insert: vi.fn(),
		select: vi.fn(),
		transaction: vi.fn(),
	},
}));

vi.mock("next/cache", () => ({
	revalidatePath,
}));

vi.mock("next/headers", () => ({
	cookies,
}));

vi.mock("@/lib/auth-server", () => ({
	requireUserId,
}));

vi.mock("@/db", () => ({
	db,
}));

function makeSelectWhereChain<T>(result: T) {
	const where = vi.fn().mockResolvedValue(result);
	return {
		from: vi.fn(() => ({ where })),
		where,
	};
}

describe("settings actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		requireUserId.mockResolvedValue("user-1");
	});

	it("saves profile fields and mirrors the theme to a cookie", async () => {
		const cookieSet = vi.fn();
		cookies.mockResolvedValue({ set: cookieSet });
		const where = vi.fn().mockResolvedValue(undefined);
		const set = vi.fn(() => ({ where }));
		db.update.mockReturnValue({ set });

		await saveProfileAction({
			name: "Tony Clevenger",
			sex: "male",
			dateOfBirth: "1990-04-19",
			heightIn: 70,
			activityLevel: "moderate",
			weightGoalLbsPerWeek: -1,
			targetCalories: 2200,
			targetProteinG: 180,
			targetFatG: 70,
			targetCarbsG: 190,
			timezone: "America/Chicago",
			themePreference: "light",
		});

		expect(cookieSet).toHaveBeenCalledWith(
			"theme-preference",
			"light",
			expect.objectContaining({
				path: "/",
				httpOnly: true,
				sameSite: "lax",
				maxAge: 60 * 60 * 24 * 365,
			}),
		);
		expect(set).toHaveBeenCalledWith({
			name: "Tony Clevenger",
			sex: "male",
			dateOfBirth: "1990-04-19",
			heightIn: "70",
			activityLevel: "moderate",
			weightGoalLbsPerWeek: "-1",
			targetCalories: 2200,
			targetProteinG: 180,
			targetFatG: 70,
			targetCarbsG: 190,
			timezone: "America/Chicago",
			themePreference: "light",
			updatedAt: expect.any(Date),
		});
		expect(revalidatePath).toHaveBeenCalledWith("/settings");
		expect(revalidatePath).toHaveBeenCalledWith("/");
	});

	it("replaces existing meal-log items during import and resolves imported food ids", async () => {
		const insertedFoods = [
			{
				id: "food-db-1",
				name: "Chicken Fajita Bowl",
				brand: "Torchys",
			},
		];
		db.insert.mockReturnValueOnce({
			values: vi.fn(() => ({
				returning: vi.fn().mockResolvedValue(insertedFoods),
			})),
		});
		db.select.mockReturnValueOnce(makeSelectWhereChain([]));

		const deleteWhere = vi.fn().mockResolvedValue(undefined);
		const deleteMealLogItems = vi.fn(() => ({ where: deleteWhere }));
		const insertMealLog = vi.fn(() => ({
			onConflictDoUpdate: vi.fn(() => ({
				returning: vi.fn().mockResolvedValue([{ id: "meal-log-1" }]),
			})),
		}));
		const insertMealLogItems = vi.fn().mockResolvedValue(undefined);
		const tx = {
			insert: vi
				.fn()
				.mockReturnValueOnce({ values: insertMealLog })
				.mockReturnValueOnce({ values: insertMealLogItems }),
			delete: deleteMealLogItems,
		};
		db.transaction.mockImplementation(async (callback) => callback(tx));

		const summary = await importDataAction(
			JSON.stringify({
				foods: [
					{
						id: "123e4567-e89b-12d3-a456-426614174000",
						name: "Chicken Fajita Bowl",
						brand: "Torchys",
						servingSize: 1,
						servingUnit: "serving",
						calories: 275,
						proteinG: 19,
						fatG: 19,
						carbsG: 7,
					},
				],
				mealLogs: [
					{
						date: "2026-04-20",
						mealType: "lunch",
						items: [
							{
								foodId: "123e4567-e89b-12d3-a456-426614174000",
								foodName: "Chicken Fajita Bowl",
								servings: 2,
								calories: 550,
								proteinG: 38,
								fatG: 38,
								carbsG: 14,
							},
						],
					},
				],
			}),
		);

		expect(summary).toEqual({
			foods: 1,
			weights: 0,
			savedMeals: 0,
			mealLogs: 1,
		});
		expect(deleteWhere).toHaveBeenCalledTimes(1);
		expect(insertMealLogItems).toHaveBeenCalledWith([
			{
				mealLogId: "meal-log-1",
				foodItemId: "food-db-1",
				servings: "2",
				sortOrder: 0,
				nameSnapshot: "Chicken Fajita Bowl",
				caloriesSnapshot: 550,
				proteinGSnapshot: "38",
				fatGSnapshot: "38",
				carbsGSnapshot: "14",
			},
		]);
		expect(revalidatePath).toHaveBeenCalledWith("/");
		expect(revalidatePath).toHaveBeenCalledWith("/stats");
	});

	it("rejects invalid JSON imports", async () => {
		await expect(importDataAction("not-json")).rejects.toThrow("Invalid JSON");
	});

	it("rejects import payloads above the raw size cap", async () => {
		await expect(
			importDataAction(" ".repeat(2 * 1024 * 1024 + 1)),
		).rejects.toThrow("Import file is too large");
	});

	it("rejects import arrays above the configured count caps", async () => {
		const tooManyFoods = Array.from({ length: 2001 }, (_, index) => ({
			name: `Food ${index}`,
			servingSize: 1,
			servingUnit: "serving",
			calories: 100,
			proteinG: 10,
			fatG: 5,
			carbsG: 8,
		}));

		await expect(
			importDataAction(JSON.stringify({ foods: tooManyFoods })),
		).rejects.toThrow();
	});

	it("imports weights and saved meals using existing foods, skipping unresolved items", async () => {
		db.select.mockReturnValueOnce(
			makeSelectWhereChain([
				{
					id: "food-db-1",
					name: "Chicken Fajita Bowl",
					brand: "Torchys",
				},
			]),
		);

		const weightOnConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
		const insertWeightValues = vi.fn(() => ({
			onConflictDoUpdate: weightOnConflictDoUpdate,
		}));
		db.insert.mockReturnValueOnce({
			values: insertWeightValues,
		});

		const savedMealValues = vi.fn(() => ({
			returning: vi.fn().mockResolvedValue([{ id: "saved-meal-1" }]),
		}));
		const savedMealItemsValues = vi.fn().mockResolvedValue(undefined);
		const tx = {
			insert: vi
				.fn()
				.mockReturnValueOnce({ values: savedMealValues })
				.mockReturnValueOnce({ values: savedMealItemsValues }),
		};
		db.transaction.mockImplementation(async (callback) => callback(tx));

		const summary = await importDataAction(
			JSON.stringify({
				weights: [
					{
						date: "2026-04-20",
						weightLbs: 205.4,
						note: "after trip",
					},
				],
				savedMeals: [
					{
						name: "Lunch Prep",
						items: [
							{
								foodName: "Chicken Fajita Bowl",
								foodBrand: "Torchys",
								servings: 2,
							},
							{
								foodName: "Missing Food",
								servings: 1,
							},
						],
					},
				],
			}),
		);

		expect(summary).toEqual({
			foods: 0,
			weights: 1,
			savedMeals: 1,
			mealLogs: 0,
		});
		expect(insertWeightValues).toHaveBeenCalledWith({
			userId: "user-1",
			date: "2026-04-20",
			weightLbs: "205.4",
			note: "after trip",
		});
		expect(savedMealValues).toHaveBeenCalledWith({
			userId: "user-1",
			name: "Lunch Prep",
		});
		expect(savedMealItemsValues).toHaveBeenCalledWith([
			{
				savedMealId: "saved-meal-1",
				foodItemId: "food-db-1",
				servings: "2",
				sortOrder: 0,
			},
		]);
		expect(revalidatePath).toHaveBeenCalledWith("/weight");
		expect(revalidatePath).toHaveBeenCalledWith("/meals");
	});
});
