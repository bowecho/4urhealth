import { fireEvent, render, screen, within } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddMealItemDialog } from "@/components/add-meal-item-dialog";
import { FoodDialog } from "@/components/food-dialog";
import { MealCard } from "@/components/meal-card";
import { SavedMealBuilder } from "@/components/saved-meal-builder";
import { SettingsView } from "@/components/settings-view";
import { WeightView } from "@/components/weight-view";

const {
	addMealItemAction,
	createFoodAction,
	createSavedMealAction,
	updateSavedMealAction,
	deleteMealItemAction,
	updateMealItemServingsAction,
	importDataAction,
	saveProfileAction,
	deleteWeightAction,
	saveWeightAction,
} = vi.hoisted(() => ({
	addMealItemAction: vi.fn(),
	createFoodAction: vi.fn(),
	createSavedMealAction: vi.fn(),
	updateSavedMealAction: vi.fn(),
	deleteMealItemAction: vi.fn(),
	updateMealItemServingsAction: vi.fn(),
	importDataAction: vi.fn(),
	saveProfileAction: vi.fn(),
	deleteWeightAction: vi.fn(),
	saveWeightAction: vi.fn(),
}));

vi.mock("@/app/(app)/day/actions", () => ({
	addMealItemAction,
	deleteMealItemAction,
	updateMealItemServingsAction,
}));

vi.mock("@/app/(app)/foods/actions", () => ({
	createFoodAction,
}));

vi.mock("@/app/(app)/meals/actions", () => ({
	createSavedMealAction,
	updateSavedMealAction,
}));

vi.mock("@/app/(app)/settings/actions", () => ({
	importDataAction,
	saveProfileAction,
}));

vi.mock("@/app/(app)/weight/actions", () => ({
	deleteWeightAction,
	saveWeightAction,
}));

vi.mock("recharts", () => {
	const Mock = ({ children }: { children?: React.ReactNode }) => (
		<div>{children}</div>
	);
	return {
		ResponsiveContainer: Mock,
		LineChart: Mock,
		CartesianGrid: () => null,
		Line: () => null,
		Tooltip: () => null,
		XAxis: () => null,
		YAxis: () => null,
	};
});

describe("numeric input regressions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("lets food dialog fields clear without snapping back to zero", () => {
		render(<FoodDialog initial={null} onSubmit={vi.fn()} onCancel={vi.fn()} />);

		const calories = screen.getByLabelText("Calories per serving");
		fireEvent.change(calories, { target: { value: "" } });
		expect(calories).toHaveValue(null);
		fireEvent.change(calories, { target: { value: "300" } });
		expect(calories).toHaveValue(300);

		const carbs = screen.getByLabelText("Carbs (g)");
		fireEvent.change(carbs, { target: { value: "" } });
		expect(carbs).toHaveValue(null);
		fireEvent.change(carbs, { target: { value: "7" } });
		expect(carbs).toHaveValue(7);
	});

	it("lets add-meal servings clear and retype cleanly", () => {
		render(
			<AddMealItemDialog
				date="2026-04-20"
				mealType="lunch"
				mealLabel="Lunch"
				onClose={vi.fn()}
				foods={[
					{
						id: "food-1",
						name: "Chicken Fajita Bowl",
						brand: "Torchys",
						servingSize: 1,
						servingUnit: "serving",
						calories: 275,
						proteinG: 19,
						fatG: 19,
						carbsG: 7,
					},
				]}
			/>,
		);

		fireEvent.click(
			screen.getByRole("button", { name: /Chicken Fajita Bowl/ }),
		);
		const servings = screen.getByLabelText("Servings");
		fireEvent.change(servings, { target: { value: "" } });
		expect(servings).toHaveValue(null);
		fireEvent.change(servings, { target: { value: "2" } });
		expect(servings).toHaveValue(2);
	});

	it("lets saved meals and meal edits clear servings without a forced zero", () => {
		render(
			<SavedMealBuilder
				initial={null}
				onClose={vi.fn()}
				foods={[
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
					},
				]}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: /Greek Yogurt/ }));
		const builderServings = screen.getByLabelText("servings");
		fireEvent.change(builderServings, { target: { value: "" } });
		expect(builderServings).toHaveValue(null);
		fireEvent.change(builderServings, { target: { value: "2.5" } });
		expect(builderServings).toHaveValue(2.5);
	});

	it("lets meal-card edit servings clear and re-enter a number", () => {
		render(
			<MealCard
				date="2026-04-20"
				mealType="breakfast"
				label="Breakfast"
				foods={[]}
				items={[
					{
						id: "meal-item-1",
						foodItemId: "food-1",
						name: "Greek Yogurt",
						servings: 1,
						calories: 130,
						proteinG: 23,
						fatG: 0,
						carbsG: 9,
					},
				]}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Edit" }));
		const servings = screen.getByLabelText("servings");
		fireEvent.change(servings, { target: { value: "" } });
		expect(servings).toHaveValue(null);
		fireEvent.change(servings, { target: { value: "2" } });
		expect(servings).toHaveValue(2);
	});

	it("lets settings and weight fields clear without reintroducing leading zeros", () => {
		const profile = {
			name: "Tony",
			email: "tsclev@gmail.com",
			sex: "male" as const,
			dateOfBirth: "1990-04-19",
			heightIn: 70,
			activityLevel: "moderate" as const,
			weightGoalLbsPerWeek: -1,
			targetCalories: 2200,
			targetProteinG: 180,
			targetFatG: 70,
			targetCarbsG: 190,
			timezone: "America/Chicago",
			themePreference: "dark" as const,
		};
		const { unmount } = render(<SettingsView profile={profile} />);

		const profileSection = screen.getByText("Profile").closest("section");
		const dailyTargetsSection = screen
			.getByText("Daily targets")
			.closest("section");
		if (!profileSection || !dailyTargetsSection) {
			throw new Error("Expected settings sections to render");
		}

		const calories = within(dailyTargetsSection).getByDisplayValue("2200");
		fireEvent.change(calories, { target: { value: "" } });
		expect(calories).toHaveValue(null);
		fireEvent.change(calories, { target: { value: "2300" } });
		expect(calories).toHaveValue(2300);

		const height = within(profileSection).getByDisplayValue("70");
		fireEvent.change(height, { target: { value: "" } });
		expect(height).toHaveValue(null);
		fireEvent.change(height, { target: { value: "72" } });
		expect(height).toHaveValue(72);

		unmount();

		render(
			<WeightView
				today="2026-04-20"
				entries={[
					{ date: "2026-04-20", weightLbs: 205.4, note: null },
					{ date: "2026-04-19", weightLbs: 206, note: null },
				]}
			/>,
		);

		const weight = screen.getByLabelText("Weight (lb)");
		fireEvent.change(weight, { target: { value: "" } });
		expect(weight).toHaveValue(null);
		fireEvent.change(weight, { target: { value: "205.4" } });
		expect(weight).toHaveValue(205.4);
	});
});
