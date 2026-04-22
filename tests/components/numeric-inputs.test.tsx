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
	addOneTimeMealItemAction,
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
	addOneTimeMealItemAction: vi.fn(),
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
	addOneTimeMealItemAction,
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
		expect(carbs).toHaveValue("");
		fireEvent.change(carbs, { target: { value: "7" } });
		expect(carbs).toHaveValue("7");
	});

	it("steps one-time food decimal fields by one and clamps at the minimum", () => {
		render(
			<AddMealItemDialog
				date="2026-04-20"
				mealType="dinner"
				mealLabel="Dinner"
				onClose={vi.fn()}
				foods={[]}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "+ One-time food" }));

		const servingSize = screen.getByLabelText("Serving size");
		const servingSizeField = servingSize.closest("div");
		expect(servingSizeField).not.toBeNull();
		if (!servingSizeField) throw new Error("Expected serving size field");
		fireEvent.click(
			within(servingSizeField).getByRole("button", { name: "Increase" }),
		);
		expect(servingSize).toHaveValue("2");
		fireEvent.click(
			within(servingSizeField).getByRole("button", { name: "Decrease" }),
		);
		expect(servingSize).toHaveValue("1");
		fireEvent.click(
			within(servingSizeField).getByRole("button", { name: "Decrease" }),
		);
		expect(servingSize).toHaveValue("0.01");

		const servings = screen.getByLabelText("Servings");
		const servingsField = servings.closest("div");
		expect(servingsField).not.toBeNull();
		if (!servingsField) throw new Error("Expected servings field");
		fireEvent.click(
			within(servingsField).getByRole("button", { name: "Increase" }),
		);
		expect(servings).toHaveValue("2");
		fireEvent.change(servings, { target: { value: "1.25" } });
		expect(servings).toHaveValue("1.25");
		fireEvent.click(
			within(servingsField).getByRole("button", { name: "Increase" }),
		);
		expect(servings).toHaveValue("2.25");

		const protein = screen.getByLabelText("Protein (g)");
		const proteinField = protein.closest("div");
		expect(proteinField).not.toBeNull();
		if (!proteinField) throw new Error("Expected protein field");
		fireEvent.click(
			within(proteinField).getByRole("button", { name: "Increase" }),
		);
		expect(protein).toHaveValue("1");
		fireEvent.click(
			within(proteinField).getByRole("button", { name: "Decrease" }),
		);
		expect(protein).toHaveValue("0");
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
		expect(servings).toHaveValue("");
		fireEvent.change(servings, { target: { value: "2" } });
		expect(servings).toHaveValue("2");
	});

	it("submits one-time foods without creating a saved food", async () => {
		addOneTimeMealItemAction.mockResolvedValue(undefined);
		render(
			<AddMealItemDialog
				date="2026-04-20"
				mealType="lunch"
				mealLabel="Lunch"
				onClose={vi.fn()}
				foods={[]}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "+ One-time food" }));
		fireEvent.change(screen.getByLabelText("Name"), {
			target: { value: "Birthday Cake" },
		});
		fireEvent.change(screen.getByLabelText("Calories per serving"), {
			target: { value: "320" },
		});
		fireEvent.change(screen.getByLabelText("Protein (g)"), {
			target: { value: "4" },
		});
		fireEvent.change(screen.getByLabelText("Fat (g)"), {
			target: { value: "14" },
		});
		fireEvent.change(screen.getByLabelText("Carbs (g)"), {
			target: { value: "48" },
		});
		fireEvent.change(screen.getByLabelText("Servings"), {
			target: { value: "1.5" },
		});
		const form = screen
			.getByRole("button", { name: "Add to Lunch" })
			.closest("form");
		expect(form).not.toBeNull();
		if (!form) throw new Error("Expected one-time food form");
		fireEvent.submit(form);

		expect(addOneTimeMealItemAction).toHaveBeenCalledWith({
			date: "2026-04-20",
			mealType: "lunch",
			name: "Birthday Cake",
			brand: undefined,
			servingSize: 1,
			servingUnit: "serving",
			calories: 320,
			proteinG: 4,
			fatG: 14,
			carbsG: 48,
			servings: 1.5,
		});
		expect(createFoodAction).not.toHaveBeenCalled();
	});

	it("accepts an integer one-time servings value without browser step validation", () => {
		addOneTimeMealItemAction.mockResolvedValue(undefined);
		render(
			<AddMealItemDialog
				date="2026-04-20"
				mealType="dinner"
				mealLabel="Dinner"
				onClose={vi.fn()}
				foods={[]}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "+ One-time food" }));
		fireEvent.change(screen.getByLabelText("Name"), {
			target: { value: "Beef Crunchy Tacos" },
		});
		fireEvent.change(screen.getByLabelText("Calories per serving"), {
			target: { value: "200" },
		});
		fireEvent.change(screen.getByLabelText("Protein (g)"), {
			target: { value: "12" },
		});
		fireEvent.change(screen.getByLabelText("Fat (g)"), {
			target: { value: "10" },
		});
		fireEvent.change(screen.getByLabelText("Carbs (g)"), {
			target: { value: "15" },
		});
		fireEvent.change(screen.getByLabelText("Servings"), {
			target: { value: "1" },
		});

		const form = screen
			.getByRole("button", { name: "Add to Dinner" })
			.closest("form");
		expect(form).not.toBeNull();
		if (!form) throw new Error("Expected one-time food form");
		fireEvent.submit(form);

		expect(addOneTimeMealItemAction).toHaveBeenCalledWith({
			date: "2026-04-20",
			mealType: "dinner",
			name: "Beef Crunchy Tacos",
			brand: undefined,
			servingSize: 1,
			servingUnit: "serving",
			calories: 200,
			proteinG: 12,
			fatG: 10,
			carbsG: 15,
			servings: 1,
		});
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
		expect(builderServings).toHaveValue("");
		fireEvent.change(builderServings, { target: { value: "2.5" } });
		expect(builderServings).toHaveValue("2.5");
	});

	it("steps saved-meal servings by one without invalidating integers", () => {
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
		const builderField = builderServings.closest("div");
		expect(builderField).not.toBeNull();
		if (!builderField) throw new Error("Expected saved meal servings field");
		fireEvent.click(
			within(builderField).getByRole("button", { name: "Increase" }),
		);
		expect(builderServings).toHaveValue("2");
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
		expect(servings).toHaveValue("");
		fireEvent.change(servings, { target: { value: "2" } });
		expect(servings).toHaveValue("2");
	});

	it("steps meal-card servings by one without going below the minimum", () => {
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
		const field = servings.closest("div");
		expect(field).not.toBeNull();
		if (!field) throw new Error("Expected meal card servings field");
		fireEvent.click(within(field).getByRole("button", { name: "Decrease" }));
		expect(servings).toHaveValue("0.01");
	});

	it("does not offer edit for one-time meal items", () => {
		render(
			<MealCard
				date="2026-04-20"
				mealType="breakfast"
				label="Breakfast"
				foods={[]}
				items={[
					{
						id: "meal-item-1",
						foodItemId: null,
						name: "Office Donut",
						servings: 1,
						calories: 260,
						proteinG: 3,
						fatG: 14,
						carbsG: 31,
					},
				]}
			/>,
		);

		expect(
			screen.queryByRole("button", { name: "Edit" }),
		).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
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
		expect(height).toHaveValue("");
		fireEvent.change(height, { target: { value: "72" } });
		expect(height).toHaveValue("72");

		const heightField = height.closest("div");
		expect(heightField).not.toBeNull();
		if (!heightField) throw new Error("Expected height field");
		fireEvent.click(
			within(heightField).getByRole("button", { name: "Increase" }),
		);
		expect(height).toHaveValue("73");

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
		expect(weight).toHaveValue("");
		fireEvent.change(weight, { target: { value: "205.4" } });
		expect(weight).toHaveValue("205.4");
		const weightField = weight.closest("div");
		expect(weightField).not.toBeNull();
		if (!weightField) throw new Error("Expected weight field");
		fireEvent.click(
			within(weightField).getByRole("button", { name: "Increase" }),
		);
		expect(weight).toHaveValue("206.4");
	});
});
