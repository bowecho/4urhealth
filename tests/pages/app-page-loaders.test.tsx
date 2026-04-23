import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, requireUserId, requireSession, requireAppPageContext } = vi.hoisted(
	() => ({
		db: {
			select: vi.fn(),
		},
		requireUserId: vi.fn(),
		requireSession: vi.fn(),
		requireAppPageContext: vi.fn(),
	}),
);

vi.mock("@/db", () => ({
	db,
}));

vi.mock("@/lib/auth-server", () => ({
	requireUserId,
	requireSession,
}));

vi.mock("@/lib/app-page", () => ({
	requireAppPageContext,
}));

function makeWhereOrderChain<T>(result: T) {
	const orderBy = vi.fn().mockResolvedValue(result);
	const where = vi.fn(() => ({ orderBy }));
	return { from: vi.fn(() => ({ where })) };
}

function makeWhereLimitChain<T>(result: T) {
	const limit = vi.fn().mockResolvedValue(result);
	const where = vi.fn(() => ({ limit }));
	return { from: vi.fn(() => ({ where })) };
}

function makeJoinWhereOrderChain<T>(result: T) {
	const orderBy = vi.fn().mockResolvedValue(result);
	const where = vi.fn(() => ({ orderBy }));
	const innerJoin = vi.fn(() => ({ where }));
	return { from: vi.fn(() => ({ innerJoin })) };
}

function makeJoinWhereGroupByChain<T>(result: T) {
	const groupBy = vi.fn().mockResolvedValue(result);
	const where = vi.fn(() => ({ groupBy }));
	const innerJoin = vi.fn(() => ({ where }));
	return { from: vi.fn(() => ({ innerJoin })) };
}

describe("app page loaders", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		requireUserId.mockResolvedValue("user-1");
		requireSession.mockResolvedValue({
			user: { id: "user-1" },
		});
		requireAppPageContext.mockResolvedValue({
			userId: "user-1",
			today: "2026-04-22",
		});
	});

	it("loads foods and maps numeric fields for the foods page", async () => {
		db.select.mockReturnValueOnce(
			makeWhereOrderChain([
				{
					id: "food-1",
					name: "Greek Yogurt",
					brand: "Fage",
					servingSize: "1.5",
					servingUnit: "cup",
					calories: 130,
					proteinG: "23",
					fatG: "0",
					carbsG: "9",
					archivedAt: null,
				},
			]),
		);
		const { default: FoodsPage } = await import("@/app/(app)/foods/page");

		const page = await FoodsPage({
			params: Promise.resolve({}),
			searchParams: Promise.resolve({ archived: "0" }),
		} as PageProps<"/foods">);
		const list = page.props.children;

		expect(list.props.showArchived).toBe(false);
		expect(list.props.items).toEqual([
			{
				id: "food-1",
				name: "Greek Yogurt",
				brand: "Fage",
				servingSize: 1.5,
				servingUnit: "cup",
				calories: 130,
				proteinG: 23,
				fatG: 0,
				carbsG: 9,
				archivedAt: null,
			},
		]);
	});

	it("loads meals, item totals, and food options for the meals page", async () => {
		db.select
			.mockReturnValueOnce(
				makeWhereOrderChain([{ id: "meal-1", name: "Breakfast Bowl" }]),
			)
			.mockReturnValueOnce(
				makeJoinWhereOrderChain([
					{
						savedMealId: "meal-1",
						servings: "2",
						sortOrder: 0,
						foodId: "food-1",
						foodName: "Greek Yogurt",
						calories: 130,
						proteinG: "23",
						fatG: "0",
						carbsG: "9",
					},
				]),
			)
			.mockReturnValueOnce(
				makeWhereOrderChain([
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
		const { default: MealsPage } = await import("@/app/(app)/meals/page");

		const page = await MealsPage();
		const view = page.props.children;

		expect(view.props.today).toBe("2026-04-22");
		expect(view.props.meals).toEqual([
			{
				id: "meal-1",
				name: "Breakfast Bowl",
				items: [
					{
						foodId: "food-1",
						foodName: "Greek Yogurt",
						servings: 2,
						calories: 130,
						proteinG: 23,
						fatG: 0,
						carbsG: 9,
					},
				],
				totals: {
					calories: 260,
					proteinG: 46,
					fatG: 0,
					carbsG: 18,
				},
			},
		]);
		expect(view.props.foods).toEqual([
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
		]);
	});

	it("throws when the settings page cannot find a profile", async () => {
		db.select.mockReturnValueOnce(makeWhereLimitChain([]));
		const { default: SettingsPage } = await import("@/app/(app)/settings/page");

		await expect(SettingsPage()).rejects.toThrow("Profile not found");
	});

	it("maps user profile values for the settings page", async () => {
		db.select.mockReturnValueOnce(
			makeWhereLimitChain([
				{
					name: "Tony",
					email: "tony@example.com",
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
					themePreference: "dark",
				},
			]),
		);
		const { default: SettingsPage } = await import("@/app/(app)/settings/page");

		const page = await SettingsPage();
		const view = page.props.children;

		expect(view.props.profile).toEqual({
			name: "Tony",
			email: "tony@example.com",
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
			themePreference: "dark",
		});
	});

	it("builds stats series for the requested range", async () => {
		requireAppPageContext.mockResolvedValue({
			userId: "user-1",
			today: "2026-04-22",
		});
		db.select
			.mockReturnValueOnce(
				makeWhereLimitChain([
					{
						targetCalories: 2200,
						targetProteinG: 180,
						targetFatG: 70,
						targetCarbsG: 190,
					},
				]),
			)
			.mockReturnValueOnce(
				makeJoinWhereGroupByChain([
					{
						date: "2026-04-22",
						calories: 2100,
						proteinG: 170,
						fatG: 65,
						carbsG: 185,
					},
				]),
			)
			.mockReturnValueOnce(
				makeWhereOrderChain([{ date: "2026-04-22", weightLbs: "205.4" }]),
			);
		const { default: StatsPage } = await import("@/app/(app)/stats/page");

		const page = await StatsPage({
			searchParams: Promise.resolve({ range: "month" }),
		});
		const view = page.props.children;

		expect(view.props.range).toBe("month");
		expect(view.props.today).toBe("2026-04-22");
		expect(view.props.targets).toEqual({
			calories: 2200,
			proteinG: 180,
			fatG: 70,
			carbsG: 190,
		});
		expect(view.props.dailySeries.at(-1)).toEqual({
			date: "2026-04-22",
			calories: 2100,
			proteinG: 170,
			fatG: 65,
			carbsG: 185,
		});
		expect(view.props.weightSeries).toEqual([
			{ date: "2026-04-22", weightLbs: 205.4 },
		]);
	});

	it("loads weight entries and maps numeric values", async () => {
		db.select.mockReturnValueOnce(
			makeWhereOrderChain([
				{
					date: "2026-04-22",
					weightLbs: "205.4",
					note: "After workout",
				},
			]),
		);
		const { default: WeightPage } = await import("@/app/(app)/weight/page");

		const page = await WeightPage();

		expect(page.props.entries).toEqual([
			{
				date: "2026-04-22",
				weightLbs: 205.4,
				note: "After workout",
			},
		]);
		expect(page.props.today).toBe("2026-04-22");
	});
});
