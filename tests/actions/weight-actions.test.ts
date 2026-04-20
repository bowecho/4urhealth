import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	deleteWeightAction,
	saveWeightAction,
} from "@/app/(app)/weight/actions";

const { revalidatePath, requireUserId, db } = vi.hoisted(() => ({
	revalidatePath: vi.fn(),
	requireUserId: vi.fn(),
	db: {
		insert: vi.fn(),
		delete: vi.fn(),
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

describe("weight actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		requireUserId.mockResolvedValue("user-1");
	});

	it("upserts a weight entry by user and date", async () => {
		const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
		const values = vi.fn(() => ({ onConflictDoUpdate }));
		db.insert.mockReturnValue({ values });

		await saveWeightAction({
			date: "2026-04-20",
			weightLbs: 205.4,
		});

		expect(values).toHaveBeenCalledWith({
			userId: "user-1",
			date: "2026-04-20",
			weightLbs: "205.4",
			note: null,
		});
		expect(onConflictDoUpdate).toHaveBeenCalledWith({
			target: expect.any(Array),
			set: {
				weightLbs: "205.4",
				note: null,
				updatedAt: expect.any(Date),
			},
		});
		expect(revalidatePath).toHaveBeenCalledWith("/weight");
	});

	it("deletes a weight entry for the current user", async () => {
		const where = vi.fn().mockResolvedValue(undefined);
		db.delete.mockReturnValue({ where });

		await deleteWeightAction({ date: "2026-04-20" });

		expect(where).toHaveBeenCalledTimes(1);
		expect(revalidatePath).toHaveBeenCalledWith("/weight");
	});
});
