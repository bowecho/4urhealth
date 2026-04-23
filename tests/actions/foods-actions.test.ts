import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	archiveFoodAction,
	createFoodAction,
	unarchiveFoodAction,
	updateFoodAction,
} from "@/app/(app)/foods/actions";

const { revalidatePath, requireUserId, db } = vi.hoisted(() => ({
	revalidatePath: vi.fn(),
	requireUserId: vi.fn(),
	db: {
		insert: vi.fn(),
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

describe("food actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		requireUserId.mockResolvedValue("user-1");
	});

	it("stringifies numeric fields and normalizes a blank brand on create", async () => {
		const returning = vi.fn().mockResolvedValue([
			{
				id: "food-1",
				name: "Greek Yogurt",
				brand: null,
				servingSize: "1.5",
				servingUnit: "container",
				calories: 130,
				proteinG: "23",
				fatG: "0",
				carbsG: "9",
			},
		]);
		const values = vi.fn(() => ({ returning }));
		db.insert.mockReturnValue({ values });

		await expect(
			createFoodAction({
				name: "Greek Yogurt",
				brand: "   ",
				servingSize: 1.5,
				servingUnit: "container",
				calories: 130,
				proteinG: 23,
				fatG: 0,
				carbsG: 9,
			}),
		).resolves.toEqual({
			id: "food-1",
			name: "Greek Yogurt",
			brand: null,
			servingSize: "1.5",
			servingUnit: "container",
			calories: 130,
			proteinG: "23",
			fatG: "0",
			carbsG: "9",
		});

		expect(values).toHaveBeenCalledWith({
			userId: "user-1",
			name: "Greek Yogurt",
			brand: null,
			servingSize: "1.5",
			servingUnit: "container",
			calories: 130,
			proteinG: "23",
			fatG: "0",
			carbsG: "9",
		});
		expect(returning).toHaveBeenCalledTimes(1);
		expect(revalidatePath).toHaveBeenCalledWith("/foods");
	});

	it("archives a food for the current user and revalidates the list", async () => {
		const where = vi.fn().mockResolvedValue(undefined);
		const set = vi.fn(() => ({ where }));
		db.update.mockReturnValue({ set });

		await archiveFoodAction("food-1");

		expect(set).toHaveBeenCalledWith({
			archivedAt: expect.any(Date),
			updatedAt: expect.any(Date),
		});
		expect(where).toHaveBeenCalledTimes(1);
		expect(revalidatePath).toHaveBeenCalledWith("/foods");
	});

	it("throws when a create returns no row", async () => {
		const returning = vi.fn().mockResolvedValue([]);
		db.insert.mockReturnValue({
			values: vi.fn(() => ({ returning })),
		});

		await expect(
			createFoodAction({
				name: "Greek Yogurt",
				brand: " ",
				servingSize: 1,
				servingUnit: "cup",
				calories: 130,
				proteinG: 23,
				fatG: 0,
				carbsG: 9,
			}),
		).rejects.toThrow("Failed to create food");
	});

	it("updates and unarchives foods for the current user", async () => {
		const updateWhere = vi.fn().mockResolvedValue(undefined);
		const updateSet = vi.fn(() => ({ where: updateWhere }));
		db.update.mockReturnValue({ set: updateSet });

		await updateFoodAction("food-1", {
			name: "Chicken Bowl",
			brand: "Torchys",
			servingSize: 1,
			servingUnit: "serving",
			calories: 275,
			proteinG: 19,
			fatG: 19,
			carbsG: 7,
		});

		expect(updateSet).toHaveBeenCalledWith({
			name: "Chicken Bowl",
			brand: "Torchys",
			servingSize: "1",
			servingUnit: "serving",
			calories: 275,
			proteinG: "19",
			fatG: "19",
			carbsG: "7",
			updatedAt: expect.any(Date),
		});

		await unarchiveFoodAction("food-1");

		expect(updateSet).toHaveBeenLastCalledWith({
			archivedAt: null,
			updatedAt: expect.any(Date),
		});
		expect(revalidatePath).toHaveBeenCalledTimes(2);
	});
});
