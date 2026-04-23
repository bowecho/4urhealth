import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	buildMealItemSnapshot,
	ensureMealLogId,
	revalidateDay,
} from "./meal-log";

const { revalidatePath, mealLog } = vi.hoisted(() => ({
	revalidatePath: vi.fn(),
	mealLog: {
		id: "meal-log-id",
		userId: "meal_log.user_id",
		date: "meal_log.date",
		mealType: "meal_log.meal_type",
	},
}));

vi.mock("next/cache", () => ({
	revalidatePath,
}));

vi.mock("@/db/schema", () => ({
	mealLog,
}));

describe("meal-log helpers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("builds rounded snapshots from servings", () => {
		expect(
			buildMealItemSnapshot(
				{
					name: "Greek Yogurt",
					calories: 130,
					proteinG: "23",
					fatG: "0",
					carbsG: "9",
				},
				1.5,
			),
		).toEqual({
			servings: "1.5",
			nameSnapshot: "Greek Yogurt",
			caloriesSnapshot: 195,
			proteinGSnapshot: "34.5",
			fatGSnapshot: "0.0",
			carbsGSnapshot: "13.5",
		});
	});

	it("upserts a meal log and returns its id", async () => {
		const returning = vi.fn().mockResolvedValue([{ id: "log-1" }]);
		const onConflictDoUpdate = vi.fn(() => ({ returning }));
		const values = vi.fn(() => ({ onConflictDoUpdate }));
		const tx = {
			insert: vi.fn(() => ({ values })),
		};

		await expect(
			ensureMealLogId(tx as never, {
				userId: "user-1",
				date: "2026-04-22",
				mealType: "dinner",
			}),
		).resolves.toBe("log-1");

		expect(values).toHaveBeenCalledWith({
			userId: "user-1",
			date: "2026-04-22",
			mealType: "dinner",
		});
		expect(onConflictDoUpdate).toHaveBeenCalledWith({
			target: [mealLog.userId, mealLog.date, mealLog.mealType],
			set: { updatedAt: expect.any(Date) },
		});
	});

	it("revalidates the root day pages", () => {
		revalidateDay("2026-04-22");

		expect(revalidatePath).toHaveBeenCalledWith("/");
		expect(revalidatePath).toHaveBeenCalledWith("/day/2026-04-22");
	});
});
