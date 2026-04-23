import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveOnboardingAction } from "@/app/onboarding/actions";

const {
	revalidatePath,
	redirect,
	requireUserId,
	todayInTz,
	db,
	user,
	weightLog,
} = vi.hoisted(() => ({
	revalidatePath: vi.fn(),
	redirect: vi.fn(),
	requireUserId: vi.fn(),
	todayInTz: vi.fn(),
	db: {
		transaction: vi.fn(),
	},
	user: { id: "user.id" },
	weightLog: {
		userId: "weight_log.user_id",
		date: "weight_log.date",
	},
}));

vi.mock("next/cache", () => ({
	revalidatePath,
}));

vi.mock("next/navigation", () => ({
	redirect,
}));

vi.mock("@/lib/auth-server", () => ({
	requireUserId,
}));

vi.mock("@/lib/date", async () => {
	const actual =
		await vi.importActual<typeof import("@/lib/date")>("@/lib/date");
	return {
		...actual,
		todayInTz,
		isValidTimeZone: vi.fn(() => true),
	};
});

vi.mock("@/db", () => ({
	db,
}));

vi.mock("@/db/schema", () => ({
	user,
	weightLog,
}));

describe("onboarding actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		requireUserId.mockResolvedValue("user-1");
		todayInTz.mockReturnValue("2026-04-22");
	});

	it("saves onboarding details, seeds today's weight, and redirects home", async () => {
		const updateWhere = vi.fn().mockResolvedValue(undefined);
		const updateSet = vi.fn(() => ({ where: updateWhere }));
		const insertOnConflict = vi.fn().mockResolvedValue(undefined);
		const insertValues = vi.fn(() => ({
			onConflictDoUpdate: insertOnConflict,
		}));
		const tx = {
			update: vi.fn(() => ({ set: updateSet })),
			insert: vi.fn(() => ({ values: insertValues })),
		};
		db.transaction.mockImplementation(async (callback) => callback(tx));

		await saveOnboardingAction({
			sex: "male",
			dateOfBirth: "1990-04-19",
			heightIn: 70,
			weightLbs: 205.4,
			activityLevel: "moderate",
			weightGoalLbsPerWeek: -1,
			targetCalories: 2200,
			targetProteinG: 180,
			targetFatG: 70,
			targetCarbsG: 190,
			timezone: "America/Chicago",
		});

		expect(todayInTz).toHaveBeenCalledWith("America/Chicago", expect.any(Date));
		expect(updateSet).toHaveBeenCalledWith({
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
			onboardedAt: expect.any(Date),
			updatedAt: expect.any(Date),
		});
		expect(insertValues).toHaveBeenCalledWith({
			userId: "user-1",
			date: "2026-04-22",
			weightLbs: "205.4",
		});
		expect(insertOnConflict).toHaveBeenCalledWith({
			target: [weightLog.userId, weightLog.date],
			set: {
				weightLbs: "205.4",
				updatedAt: expect.any(Date),
			},
		});
		expect(revalidatePath).toHaveBeenCalledWith("/");
		expect(redirect).toHaveBeenCalledWith("/");
	});
});
