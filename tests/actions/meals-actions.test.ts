import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	applySavedMealAction,
	archiveSavedMealAction,
	createSavedMealAction,
	updateSavedMealAction,
} from "@/app/(app)/meals/actions";

const { revalidatePath, requireUserId, db } = vi.hoisted(() => ({
	revalidatePath: vi.fn(),
	requireUserId: vi.fn(),
	db: {
		select: vi.fn(),
		transaction: vi.fn(),
		update: vi.fn(),
	},
}));

vi.mock("next/cache", () => ({
	revalidatePath,
}));

vi.mock("@/lib/auth-server", () => ({
	requireUserId,
}));

vi.mock("@/db", () => ({
	db,
}));

function makeWhereLimitChain<T>(result: T) {
	const limit = vi.fn().mockResolvedValue(result);
	const where = vi.fn(() => ({ limit }));
	return {
		from: vi.fn(() => ({ where })),
		limit,
		where,
	};
}

function makeJoinWhereOrderChain<T>(result: T) {
	const orderBy = vi.fn().mockResolvedValue(result);
	const where = vi.fn(() => ({ orderBy }));
	const innerJoin = vi.fn(() => ({ where }));
	return {
		from: vi.fn(() => ({ innerJoin })),
		innerJoin,
		orderBy,
		where,
	};
}

describe("meal actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		db.select.mockReset();
		db.transaction.mockReset();
		requireUserId.mockResolvedValue("user-1");
	});

	it("creates a saved meal after confirming the user owns the foods", async () => {
		const ownedFoods = makeWhereLimitChain([{ id: "food-1" }]);
		db.select.mockReturnValueOnce({
			from: vi.fn(() => ({
				where: vi.fn().mockResolvedValue([{ id: "food-1" }]),
			})),
		});

		const insertSavedMealValues = vi.fn(() => ({
			returning: vi.fn().mockResolvedValue([{ id: "meal-1" }]),
		}));
		const insertMealItemsValues = vi.fn().mockResolvedValue(undefined);
		const tx = {
			insert: vi
				.fn()
				.mockReturnValueOnce({ values: insertSavedMealValues })
				.mockReturnValueOnce({ values: insertMealItemsValues }),
		};
		db.transaction.mockImplementation(async (callback) => callback(tx));

		await createSavedMealAction({
			name: "Breakfast Bowl",
			items: [
				{ foodItemId: "018fd34f-e3d5-7ca3-b6cb-c820a1766a0e", servings: 2 },
			],
		});

		expect(insertSavedMealValues).toHaveBeenCalledWith({
			userId: "user-1",
			name: "Breakfast Bowl",
		});
		expect(insertMealItemsValues).toHaveBeenCalledWith([
			{
				savedMealId: "meal-1",
				foodItemId: "018fd34f-e3d5-7ca3-b6cb-c820a1766a0e",
				servings: "2",
				sortOrder: 0,
			},
		]);
		expect(revalidatePath).toHaveBeenCalledWith("/meals");
		expect(ownedFoods).toBeDefined();
	});

	it("applies a saved meal by snapshotting its foods into the daily log", async () => {
		db.select
			.mockReturnValueOnce(makeWhereLimitChain([{ id: "meal-1" }]))
			.mockReturnValueOnce(
				makeJoinWhereOrderChain([
					{
						servings: "1.5",
						sortOrder: 0,
						food: {
							id: "food-1",
							name: "Greek Yogurt",
							calories: 130,
							proteinG: "23",
							fatG: "0",
							carbsG: "9",
						},
					},
				]),
			);

		const upsertMealLog = vi.fn(() => ({
			onConflictDoUpdate: vi.fn(() => ({
				returning: vi.fn().mockResolvedValue([{ id: "log-1" }]),
			})),
		}));
		const insertMealItems = vi.fn().mockResolvedValue(undefined);
		const tx = {
			insert: vi
				.fn()
				.mockReturnValueOnce({ values: upsertMealLog })
				.mockReturnValueOnce({ values: insertMealItems }),
		};
		db.transaction.mockImplementation(async (callback) => callback(tx));

		await applySavedMealAction({
			savedMealId: "018fd34f-e3d5-7ca3-b6cb-c820a1766a0e",
			date: "2026-04-20",
			mealType: "breakfast",
		});

		expect(insertMealItems).toHaveBeenCalledWith([
			{
				mealLogId: "log-1",
				foodItemId: "food-1",
				servings: "1.5",
				sortOrder: 0,
				nameSnapshot: "Greek Yogurt",
				caloriesSnapshot: 195,
				proteinGSnapshot: "34.5",
				fatGSnapshot: "0.0",
				carbsGSnapshot: "13.5",
			},
		]);
		expect(revalidatePath).toHaveBeenCalledWith("/");
		expect(revalidatePath).toHaveBeenCalledWith("/day/2026-04-20");
	});

	it("rejects saved meals when the user does not own all referenced foods", async () => {
		db.select.mockReturnValue({
			from: vi.fn(() => ({
				where: vi.fn().mockResolvedValue([{ id: "food-1" }]),
			})),
		});

		await expect(
			createSavedMealAction({
				name: "Breakfast Bowl",
				items: [
					{ foodItemId: "018fd34f-e3d5-7ca3-b6cb-c820a1766a0e", servings: 1 },
					{ foodItemId: "018fd34f-e3d5-7ca3-b6cb-c820a1766a0f", servings: 1 },
				],
			}),
		).rejects.toThrow("One or more foods not found");
	});

	it("updates and archives saved meals owned by the current user", async () => {
		db.select
			.mockReturnValueOnce({
				from: vi.fn(() => ({
					where: vi.fn().mockResolvedValue([{ id: "food-1" }]),
				})),
			})
			.mockReturnValueOnce({
				from: vi.fn(() => ({
					where: vi.fn(() => ({
						limit: vi.fn().mockResolvedValue([{ id: "meal-1" }]),
					})),
				})),
			});

		const updateSavedMealSet = vi.fn(() => ({
			where: vi.fn().mockResolvedValue(undefined),
		}));
		const deleteMealItemsWhere = vi.fn().mockResolvedValue(undefined);
		const insertMealItemsValues = vi.fn().mockResolvedValue(undefined);
		const tx = {
			update: vi.fn(() => ({ set: updateSavedMealSet })),
			delete: vi.fn(() => ({ where: deleteMealItemsWhere })),
			insert: vi.fn(() => ({ values: insertMealItemsValues })),
		};
		db.transaction.mockImplementation(async (callback) => callback(tx));

		await updateSavedMealAction("meal-1", {
			name: "Updated Bowl",
			items: [
				{ foodItemId: "018fd34f-e3d5-7ca3-b6cb-c820a1766a0e", servings: 2 },
			],
		});

		expect(updateSavedMealSet).toHaveBeenCalledWith({
			name: "Updated Bowl",
			updatedAt: expect.any(Date),
		});
		expect(deleteMealItemsWhere).toHaveBeenCalledTimes(1);
		expect(insertMealItemsValues).toHaveBeenCalledWith([
			{
				savedMealId: "meal-1",
				foodItemId: "018fd34f-e3d5-7ca3-b6cb-c820a1766a0e",
				servings: "2",
				sortOrder: 0,
			},
		]);

		const archiveWhere = vi.fn().mockResolvedValue(undefined);
		const archiveSet = vi.fn(() => ({ where: archiveWhere }));
		db.update = vi.fn(() => ({ set: archiveSet }));

		await archiveSavedMealAction("meal-1");

		expect(archiveSet).toHaveBeenCalledWith({
			archivedAt: expect.any(Date),
			updatedAt: expect.any(Date),
		});
	});

	it("rejects missing or empty saved meals during apply", async () => {
		db.select.mockReturnValueOnce(makeWhereLimitChain([]));

		await expect(
			applySavedMealAction({
				savedMealId: "018fd34f-e3d5-7ca3-b6cb-c820a1766a0e",
				date: "2026-04-20",
				mealType: "breakfast",
			}),
		).rejects.toThrow("Not found");

		db.select
			.mockReturnValueOnce(makeWhereLimitChain([{ id: "meal-1" }]))
			.mockReturnValueOnce(makeJoinWhereOrderChain([]));

		await expect(
			applySavedMealAction({
				savedMealId: "018fd34f-e3d5-7ca3-b6cb-c820a1766a0e",
				date: "2026-04-20",
				mealType: "breakfast",
			}),
		).rejects.toThrow("Saved meal has no items");
	});
});
