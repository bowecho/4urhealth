import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddMealItemDialog } from "@/components/add-meal-item-dialog";

const { addMealItemAction, addOneTimeMealItemAction, createFoodAction } =
	vi.hoisted(() => ({
		addMealItemAction: vi.fn(),
		addOneTimeMealItemAction: vi.fn(),
		createFoodAction: vi.fn(),
	}));

vi.mock("@/app/(app)/day/actions", () => ({
	addMealItemAction,
	addOneTimeMealItemAction,
}));

vi.mock("@/app/(app)/foods/actions", () => ({
	createFoodAction,
}));

const FOODS = [
	{
		id: "food-1",
		name: "Greek Yogurt",
		brand: "Fage",
		servingSize: 1,
		servingUnit: "cup",
		calories: 100,
		proteinG: 10,
		fatG: 4,
		carbsG: 8,
	},
	{
		id: "food-2",
		name: "Chicken Bowl",
		brand: "Torchys",
		servingSize: 1,
		servingUnit: "bowl",
		calories: 450,
		proteinG: 30,
		fatG: 18,
		carbsG: 40,
	},
] as const;

describe("AddMealItemDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("shows empty and filtered food states and closes from the chrome controls", () => {
		const onClose = vi.fn();
		const { unmount } = render(
			<AddMealItemDialog
				date="2026-04-22"
				mealType="breakfast"
				mealLabel="Breakfast"
				foods={[]}
				onClose={onClose}
			/>,
		);

		expect(
			screen.getByText("No foods yet. Create one to get started."),
		).toBeInTheDocument();

		unmount();
		render(
			<AddMealItemDialog
				date="2026-04-22"
				mealType="breakfast"
				mealLabel="Breakfast"
				foods={[...FOODS]}
				onClose={onClose}
			/>,
		);

		fireEvent.change(screen.getByPlaceholderText("Search foods…"), {
			target: { value: "fage" },
		});
		expect(screen.getByRole("button", { name: /Greek Yogurt/i })).toBeVisible();
		expect(
			screen.queryByRole("button", { name: /Chicken Bowl/i }),
		).not.toBeInTheDocument();

		fireEvent.change(screen.getByPlaceholderText("Search foods…"), {
			target: { value: "zzz" },
		});
		expect(screen.getByText("No matches.")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Close" }));
		expect(onClose).toHaveBeenCalled();
	});

	it("handles saved-food add errors, back navigation, and successful add", async () => {
		const onClose = vi.fn();
		addMealItemAction
			.mockRejectedValueOnce(new Error("Add failed"))
			.mockResolvedValueOnce(undefined);

		render(
			<AddMealItemDialog
				date="2026-04-22"
				mealType="lunch"
				mealLabel="Lunch"
				foods={[FOODS[0]]}
				onClose={onClose}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: /Greek Yogurt/i }));
		const servings = screen.getByLabelText("Servings");
		const addButton = screen.getByRole("button", { name: "Add" });

		fireEvent.change(servings, { target: { value: "" } });
		expect(addButton).toBeDisabled();

		fireEvent.change(servings, { target: { value: "2" } });
		expect(screen.getByText(/Total: 200 cal/)).toBeInTheDocument();

		fireEvent.click(addButton);
		expect(await screen.findByText("Add failed")).toBeInTheDocument();
		expect(addMealItemAction).toHaveBeenCalledWith({
			date: "2026-04-22",
			mealType: "lunch",
			foodItemId: "food-1",
			servings: 2,
		});

		fireEvent.click(screen.getByRole("button", { name: "Back" }));
		expect(
			screen.getByRole("button", { name: /Greek Yogurt/i }),
		).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: /Greek Yogurt/i }));
		fireEvent.click(screen.getByRole("button", { name: "Add" }));

		await waitFor(() => expect(onClose).toHaveBeenCalled());
	});

	it("creates a saved food inline and selects it for adding", async () => {
		const onClose = vi.fn();
		createFoodAction.mockResolvedValue({
			id: "food-3",
			name: "Protein Bar",
			brand: "Quest",
			servingSize: "1",
			servingUnit: "bar",
			calories: 200,
			proteinG: "20",
			fatG: "8",
			carbsG: "21",
		});
		addMealItemAction.mockResolvedValue(undefined);

		render(
			<AddMealItemDialog
				date="2026-04-22"
				mealType="dinner"
				mealLabel="Dinner"
				foods={[FOODS[0]]}
				onClose={onClose}
			/>,
		);

		fireEvent.change(screen.getByPlaceholderText("Search foods…"), {
			target: { value: "  Protein Bar  " },
		});
		fireEvent.click(screen.getByRole("button", { name: "+ New food" }));

		expect(
			screen.getByRole("heading", { name: "New food" }),
		).toBeInTheDocument();
		expect(screen.getByLabelText("Name")).toHaveValue("Protein Bar");

		const form = screen.getByRole("button", { name: "Save" }).closest("form");
		if (!form) throw new Error("Expected create-food form");
		fireEvent.submit(form);

		await waitFor(() =>
			expect(createFoodAction).toHaveBeenCalledWith({
				name: "Protein Bar",
				brand: undefined,
				servingSize: 1,
				servingUnit: "serving",
				calories: 0,
				proteinG: 0,
				fatG: 0,
				carbsG: 0,
			}),
		);

		expect(screen.getByText("Protein Bar")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Add" }));

		await waitFor(() =>
			expect(addMealItemAction).toHaveBeenCalledWith({
				date: "2026-04-22",
				mealType: "dinner",
				foodItemId: "food-3",
				servings: 1,
			}),
		);
	});

	it("validates one-time food servings and returns to search on cancel", async () => {
		render(
			<AddMealItemDialog
				date="2026-04-22"
				mealType="dinner"
				mealLabel="Dinner"
				foods={[FOODS[0]]}
				onClose={vi.fn()}
			/>,
		);

		fireEvent.change(screen.getByPlaceholderText("Search foods…"), {
			target: { value: "Cake" },
		});
		fireEvent.click(screen.getByRole("button", { name: "+ One-time food" }));

		expect(
			screen.getByRole("heading", { name: "One-time food" }),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"Adds this only to dinner and won’t save it to your foods list.",
			),
		).toBeInTheDocument();
		expect(screen.getByLabelText("Name")).toHaveValue("Cake");

		fireEvent.change(screen.getByLabelText("Servings"), {
			target: { value: "" },
		});
		const form = screen
			.getByRole("button", { name: "Add to Dinner" })
			.closest("form");
		if (!form) throw new Error("Expected one-time form");
		fireEvent.submit(form);

		expect(
			await screen.findByText("Servings must be at least 0.01"),
		).toBeInTheDocument();
		expect(addOneTimeMealItemAction).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
		expect(screen.getByPlaceholderText("Search foods…")).toBeInTheDocument();
	});
});
