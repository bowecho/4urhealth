import { beforeEach, describe, expect, it, vi } from "vitest";
import { addOneTimeMealItemAction } from "@/app/(app)/day/actions";

const { revalidatePath, requireUserId, db, mealLog, mealLogItem } = vi.hoisted(
	() => {
		const mealLogId = {
			id: "meal-log-id",
			userId: "user_id",
			date: "date",
			mealType: "meal_type",
		};
		const mealLogItemId = { mealLogId: "meal_log_id" };
		return {
			revalidatePath: vi.fn(),
			requireUserId: vi.fn(),
			db: {
				transaction: vi.fn(),
			},
			mealLog: mealLogId,
			mealLogItem: mealLogItemId,
		};
	},
);

vi.mock("next/cache", () => ({
	revalidatePath,
}));

vi.mock("@/lib/auth-server", () => ({
	requireUserId,
}));

vi.mock("@/db", () => ({
	db,
}));

vi.mock("@/db/schema", () => ({
	foodItem: {},
	mealLog,
	mealLogItem,
}));

describe("day actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		requireUserId.mockResolvedValue("user-1");
	});

	it("creates a one-time meal item with null food id and snapshots", async () => {
		const mealReturning = vi.fn().mockResolvedValue([{ id: "log-1" }]);
		const mealOnConflictDoUpdate = vi.fn(() => ({ returning: mealReturning }));
		const mealValues = vi.fn(() => ({
			onConflictDoUpdate: mealOnConflictDoUpdate,
		}));
		const itemValues = vi.fn().mockResolvedValue(undefined);
		const tx = {
			insert: vi.fn((table) => {
				if (table === mealLog) return { values: mealValues };
				if (table === mealLogItem) return { values: itemValues };
				throw new Error("Unexpected table");
			}),
		};
		db.transaction.mockImplementation(async (callback) => callback(tx));

		await addOneTimeMealItemAction({
			date: "2026-04-21",
			mealType: "lunch",
			name: "Street Taco",
			brand: "Truck",
			servingSize: 1,
			servingUnit: "taco",
			calories: 180,
			proteinG: 12,
			fatG: 8,
			carbsG: 14,
			servings: 2.5,
		});

		expect(mealValues).toHaveBeenCalledWith({
			userId: "user-1",
			date: "2026-04-21",
			mealType: "lunch",
		});
		expect(itemValues).toHaveBeenCalledWith({
			mealLogId: "log-1",
			foodItemId: null,
			servings: "2.5",
			nameSnapshot: "Street Taco",
			caloriesSnapshot: 450,
			proteinGSnapshot: "30.0",
			fatGSnapshot: "20.0",
			carbsGSnapshot: "35.0",
		});
		expect(revalidatePath).toHaveBeenCalledWith("/");
		expect(revalidatePath).toHaveBeenCalledWith("/day/2026-04-21");
	});
});
