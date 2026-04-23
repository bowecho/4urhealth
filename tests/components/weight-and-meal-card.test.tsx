import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MealCard } from "@/components/meal-card";
import { WeightView } from "@/components/weight-view";

const {
	saveWeightAction,
	deleteWeightAction,
	deleteMealItemAction,
	updateMealItemServingsAction,
	Line,
} = vi.hoisted(() => ({
	saveWeightAction: vi.fn(),
	deleteWeightAction: vi.fn(),
	deleteMealItemAction: vi.fn(),
	updateMealItemServingsAction: vi.fn(),
	Line: vi.fn(() => null),
}));

vi.mock("@/app/(app)/weight/actions", () => ({
	saveWeightAction,
	deleteWeightAction,
}));

vi.mock("@/app/(app)/day/actions", () => ({
	deleteMealItemAction,
	updateMealItemServingsAction,
}));

vi.mock("@/components/add-meal-item-dialog", () => ({
	AddMealItemDialog: ({
		mealLabel,
		onClose,
	}: {
		mealLabel: string;
		onClose: () => void;
	}) => (
		<div data-testid="add-meal-dialog">
			<p>{mealLabel}</p>
			<button type="button" onClick={onClose}>
				Close Add Dialog
			</button>
		</div>
	),
}));

vi.mock("recharts", () => {
	const Mock = ({ children }: { children?: React.ReactNode }) => (
		<div>{children}</div>
	);
	return {
		CartesianGrid: () => null,
		LineChart: Mock,
		Line,
		Tooltip: () => null,
		XAxis: () => null,
		YAxis: () => null,
	};
});

function countMovingAverageLineCalls() {
	const calls = Line.mock.calls as Array<[props?: { dataKey?: string }]>;
	return calls.filter(([props]) => props?.dataKey === "ma").length;
}

describe("WeightView", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		saveWeightAction.mockResolvedValue(undefined);
		deleteWeightAction.mockResolvedValue(undefined);
	});

	it("shows empty and validation states when there are no entries", async () => {
		render(<WeightView entries={[]} today="2026-04-22" />);

		expect(screen.getByText("No entries in this range.")).toBeInTheDocument();
		expect(screen.getByText("No entries yet.")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
		expect(saveWeightAction).not.toHaveBeenCalled();
	});

	it("saves, edits, deletes, and recalculates the range delta", async () => {
		render(
			<WeightView
				today="2026-04-22"
				entries={[
					{ date: "2025-06-01", weightLbs: 220, note: null },
					{ date: "2026-03-01", weightLbs: 210, note: null },
					{ date: "2026-04-22", weightLbs: 200, note: null },
				]}
			/>,
		);

		expect(screen.getByText("-10.0 lb over range")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "1y" }));
		expect(screen.getByText("-20.0 lb over range")).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText("Weight (lb)"), {
			target: { value: "199.2" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() =>
			expect(saveWeightAction).toHaveBeenCalledWith({
				date: "2026-04-22",
				weightLbs: 199.2,
			}),
		);

		const latestRow = screen.getByText("2026-04-22").closest("li");
		expect(latestRow).not.toBeNull();
		if (!latestRow) {
			throw new Error("Expected latest weight row");
		}

		fireEvent.click(within(latestRow).getByRole("button", { name: "Edit" }));
		fireEvent.change(screen.getByLabelText("weight"), {
			target: { value: "" },
		});
		fireEvent.click(screen.getAllByRole("button", { name: "Save" })[1]);
		expect(await screen.findByText("Weight is required")).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText("weight"), {
			target: { value: "208.5" },
		});
		fireEvent.click(screen.getAllByRole("button", { name: "Save" })[1]);

		await waitFor(() =>
			expect(saveWeightAction).toHaveBeenCalledWith({
				date: "2026-04-22",
				weightLbs: 208.5,
			}),
		);

		await waitFor(() =>
			expect(
				screen.queryByRole("button", { name: "Cancel" }),
			).not.toBeInTheDocument(),
		);
		fireEvent.click(within(latestRow).getByRole("button", { name: "Delete" }));
		await waitFor(() =>
			expect(deleteWeightAction).toHaveBeenCalledWith({ date: "2026-04-22" }),
		);
	});

	it("toggles the moving-average line on the chart", () => {
		render(
			<WeightView
				today="2026-04-22"
				entries={[
					{ date: "2026-04-20", weightLbs: 202, note: null },
					{ date: "2026-04-21", weightLbs: 201, note: null },
					{ date: "2026-04-22", weightLbs: 200, note: null },
				]}
			/>,
		);

		expect(countMovingAverageLineCalls()).toBe(1);

		fireEvent.click(screen.getByRole("checkbox", { name: "7-day avg" }));

		expect(countMovingAverageLineCalls()).toBe(1);
		expect(
			screen.getByRole("checkbox", { name: "7-day avg" }),
		).not.toBeChecked();
	});
});

describe("MealCard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		deleteMealItemAction.mockResolvedValue(undefined);
		updateMealItemServingsAction.mockResolvedValue(undefined);
	});

	it("shows the empty state and opens the add dialog", () => {
		render(
			<MealCard
				date="2026-04-22"
				mealType="lunch"
				label="Lunch"
				items={[]}
				foods={[]}
			/>,
		);

		expect(
			screen.getByText(
				"Nothing logged yet. Add a food or saved meal when you’re ready.",
			),
		).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "+ Add" }));
		expect(screen.getByTestId("add-meal-dialog")).toHaveTextContent("Lunch");
		fireEvent.click(screen.getByRole("button", { name: "Close Add Dialog" }));
		expect(screen.queryByTestId("add-meal-dialog")).not.toBeInTheDocument();
	});

	it("edits servings for saved foods and removes meal items", async () => {
		render(
			<MealCard
				date="2026-04-22"
				mealType="breakfast"
				label="Breakfast"
				foods={[]}
				items={[
					{
						id: "item-1",
						foodItemId: "food-1",
						servings: 1.5,
						name: "Greek Yogurt",
						calories: 130,
						proteinG: 23,
						fatG: 0,
						carbsG: 9,
					},
					{
						id: "item-2",
						foodItemId: null,
						servings: 1,
						name: "One-time Apple",
						calories: 95,
						proteinG: 0.5,
						fatG: 0.3,
						carbsG: 25,
					},
				]}
			/>,
		);

		expect(screen.getByText("225 cal")).toBeInTheDocument();
		expect(
			screen.getByText("1.5 servings · 130 cal · P 23g · F 0g · C 9g"),
		).toBeInTheDocument();
		expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(1);

		fireEvent.click(screen.getByRole("button", { name: "Edit" }));
		fireEvent.change(screen.getByLabelText("servings"), {
			target: { value: "" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Save" }));
		expect(updateMealItemServingsAction).not.toHaveBeenCalled();

		fireEvent.change(screen.getByLabelText("servings"), {
			target: { value: "2.25" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() =>
			expect(updateMealItemServingsAction).toHaveBeenCalledWith({
				mealLogItemId: "item-1",
				servings: 2.25,
				date: "2026-04-22",
			}),
		);

		await waitFor(() =>
			expect(screen.queryByLabelText("servings")).not.toBeInTheDocument(),
		);
		const appleRow = screen.getByText("One-time Apple").closest("li");
		expect(appleRow).not.toBeNull();
		if (!appleRow) {
			throw new Error("Expected one-time meal row");
		}
		fireEvent.click(within(appleRow).getByRole("button", { name: "Remove" }));

		await waitFor(() =>
			expect(deleteMealItemAction).toHaveBeenCalledWith({
				mealLogItemId: "item-2",
				date: "2026-04-22",
			}),
		);
	});
});
