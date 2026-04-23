import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FoodsList } from "@/components/foods-list";
import { MealsView } from "@/components/meals-view";

const {
	archiveFoodAction,
	createFoodAction,
	unarchiveFoodAction,
	updateFoodAction,
	applySavedMealAction,
	archiveSavedMealAction,
} = vi.hoisted(() => ({
	archiveFoodAction: vi.fn(),
	createFoodAction: vi.fn(),
	unarchiveFoodAction: vi.fn(),
	updateFoodAction: vi.fn(),
	applySavedMealAction: vi.fn(),
	archiveSavedMealAction: vi.fn(),
}));

vi.mock("@/app/(app)/foods/actions", () => ({
	archiveFoodAction,
	createFoodAction,
	unarchiveFoodAction,
	updateFoodAction,
}));

vi.mock("@/app/(app)/meals/actions", () => ({
	applySavedMealAction,
	archiveSavedMealAction,
}));

vi.mock("@/components/food-dialog", () => ({
	FoodDialog: ({
		initial,
		onSubmit,
		onCancel,
	}: {
		initial: { name: string } | null;
		onSubmit: (input: {
			name: string;
			servingSize: number;
			servingUnit: string;
			calories: number;
			proteinG: number;
			fatG: number;
			carbsG: number;
		}) => Promise<void>;
		onCancel: () => void;
	}) => (
		<div data-testid="food-dialog">
			<p>{initial?.name ?? "new-food"}</p>
			<button
				type="button"
				onClick={() =>
					onSubmit({
						name: initial?.name ?? "Created Food",
						servingSize: 1,
						servingUnit: "serving",
						calories: 100,
						proteinG: 10,
						fatG: 1,
						carbsG: 5,
					})
				}
			>
				Submit Food
			</button>
			<button type="button" onClick={onCancel}>
				Cancel Food
			</button>
		</div>
	),
}));

vi.mock("@/components/saved-meal-builder", () => ({
	SavedMealBuilder: ({
		initial,
		onClose,
	}: {
		initial: { name: string } | null;
		onClose: () => void;
	}) => (
		<div data-testid="saved-meal-builder">
			<p>{initial?.name ?? "new-meal"}</p>
			<button type="button" onClick={onClose}>
				Close Builder
			</button>
		</div>
	),
}));

vi.mock("@/components/modal-shell", () => ({
	ModalShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("FoodsList", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createFoodAction.mockResolvedValue(undefined);
		updateFoodAction.mockResolvedValue(undefined);
		archiveFoodAction.mockResolvedValue(undefined);
		unarchiveFoodAction.mockResolvedValue(undefined);
	});

	it("filters foods by name and brand", () => {
		render(
			<FoodsList
				showArchived={false}
				items={[
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
						archivedAt: null,
					},
					{
						id: "food-2",
						name: "Banana",
						brand: null,
						servingSize: 1,
						servingUnit: "fruit",
						calories: 100,
						proteinG: 1,
						fatG: 0,
						carbsG: 27,
						archivedAt: null,
					},
				]}
			/>,
		);

		fireEvent.change(screen.getByPlaceholderText("Search foods…"), {
			target: { value: "fage" },
		});

		expect(screen.getByText("Greek Yogurt")).toBeInTheDocument();
		expect(screen.queryByText("Banana")).not.toBeInTheDocument();
	});

	it("creates a food through the dialog", async () => {
		render(<FoodsList showArchived={false} items={[]} />);

		fireEvent.click(screen.getByRole("button", { name: "+ New food" }));
		fireEvent.click(screen.getByRole("button", { name: "Submit Food" }));

		await waitFor(() => expect(createFoodAction).toHaveBeenCalledTimes(1));
		await waitFor(() =>
			expect(screen.queryByTestId("food-dialog")).not.toBeInTheDocument(),
		);
	});

	it("edits an active food and archives or restores foods", async () => {
		render(
			<FoodsList
				showArchived={false}
				items={[
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
						archivedAt: null,
					},
					{
						id: "food-2",
						name: "Old Cereal",
						brand: null,
						servingSize: 1,
						servingUnit: "serving",
						calories: 200,
						proteinG: 3,
						fatG: 2,
						carbsG: 40,
						archivedAt: new Date("2026-04-01T00:00:00.000Z"),
					},
				]}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Edit" }));
		fireEvent.click(screen.getByRole("button", { name: "Submit Food" }));
		await waitFor(() =>
			expect(updateFoodAction).toHaveBeenCalledWith(
				"food-1",
				expect.objectContaining({ name: "Greek Yogurt" }),
			),
		);

		fireEvent.click(screen.getByRole("button", { name: "Archive" }));
		await waitFor(() =>
			expect(archiveFoodAction).toHaveBeenCalledWith("food-1"),
		);

		fireEvent.click(screen.getByRole("button", { name: "Restore" }));
		await waitFor(() =>
			expect(unarchiveFoodAction).toHaveBeenCalledWith("food-2"),
		);
	});
});

describe("MealsView", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		applySavedMealAction.mockResolvedValue(undefined);
		archiveSavedMealAction.mockResolvedValue(undefined);
	});

	it("shows the empty-state copy when there are no meals", () => {
		const { rerender } = render(
			<MealsView meals={[]} foods={[]} today="2026-04-22" />,
		);

		expect(screen.getByText("You need foods before meals")).toBeInTheDocument();

		rerender(<MealsView meals={[]} foods={[mockFood()]} today="2026-04-22" />);
		expect(screen.getByText("No saved meals yet")).toBeInTheDocument();
	});

	it("opens create and edit builders and archives a meal", async () => {
		const meal = mockMeal();
		render(
			<MealsView meals={[meal]} foods={[mockFood()]} today="2026-04-22" />,
		);

		fireEvent.click(screen.getByRole("button", { name: "+ New saved meal" }));
		expect(screen.getByTestId("saved-meal-builder")).toHaveTextContent(
			"new-meal",
		);
		fireEvent.click(screen.getByRole("button", { name: "Close Builder" }));

		fireEvent.click(screen.getByRole("button", { name: "Edit" }));
		expect(screen.getByTestId("saved-meal-builder")).toHaveTextContent(
			"Breakfast Bowl",
		);
		fireEvent.click(screen.getByRole("button", { name: "Close Builder" }));

		fireEvent.click(screen.getByRole("button", { name: "Delete" }));
		await waitFor(() =>
			expect(archiveSavedMealAction).toHaveBeenCalledWith("meal-1"),
		);
	});

	it("logs a saved meal and shows errors from the apply dialog", async () => {
		const meal = mockMeal();
		applySavedMealAction
			.mockRejectedValueOnce(new Error("Apply failed"))
			.mockResolvedValueOnce(undefined);
		render(
			<MealsView meals={[meal]} foods={[mockFood()]} today="2026-04-22" />,
		);

		fireEvent.click(screen.getByRole("button", { name: "Log" }));
		fireEvent.click(screen.getByRole("button", { name: "Log it" }));

		await waitFor(() =>
			expect(applySavedMealAction).toHaveBeenCalledWith({
				savedMealId: "meal-1",
				date: "2026-04-22",
				mealType: "lunch",
			}),
		);
		await waitFor(() =>
			expect(screen.getByText("Apply failed")).toBeInTheDocument(),
		);

		fireEvent.change(screen.getByLabelText("Date"), {
			target: { value: "2026-04-21" },
		});
		fireEvent.change(screen.getByLabelText("Meal"), {
			target: { value: "snack" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Log it" }));

		await waitFor(() =>
			expect(applySavedMealAction).toHaveBeenCalledWith({
				savedMealId: "meal-1",
				date: "2026-04-21",
				mealType: "snack",
			}),
		);
		await waitFor(() =>
			expect(
				screen.queryByRole("heading", { name: 'Log "Breakfast Bowl"' }),
			).not.toBeInTheDocument(),
		);
	});
});

function mockFood() {
	return {
		id: "food-1",
		name: "Greek Yogurt",
		brand: "Fage",
		servingSize: 1,
		servingUnit: "cup",
		calories: 130,
		proteinG: 23,
		fatG: 0,
		carbsG: 9,
	};
}

function mockMeal() {
	return {
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
	};
}
