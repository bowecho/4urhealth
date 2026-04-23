import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DayTotals } from "@/components/day-totals";
import { SavedMealBuilder } from "@/components/saved-meal-builder";

const { createSavedMealAction, updateSavedMealAction, useEscapeKey } =
	vi.hoisted(() => ({
		createSavedMealAction: vi.fn(),
		updateSavedMealAction: vi.fn(),
		useEscapeKey: vi.fn(),
	}));

vi.mock("@/app/(app)/meals/actions", () => ({
	createSavedMealAction,
	updateSavedMealAction,
}));

vi.mock("@/components/modal-shell", () => ({
	ModalShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/lib/use-escape-key", () => ({
	useEscapeKey,
}));

describe("DayTotals", () => {
	it("renders calorie remaining and macro bars", () => {
		const { container } = render(
			<DayTotals
				totals={{
					calories: 1450.2,
					proteinG: 120.1,
					fatG: 55.5,
					carbsG: 110.4,
				}}
				targets={{ calories: 2200, proteinG: 180, fatG: 70, carbsG: 200 }}
			/>,
		);

		expect(screen.getByText("Calories left")).toBeInTheDocument();
		expect(screen.getByText("750")).toBeInTheDocument();
		expect(screen.getByText("1450 / 2200")).toBeInTheDocument();
		expect(screen.getByText("120 / 180g · 60g left")).toBeInTheDocument();
		expect(screen.getByText("56 / 70g · 15g left")).toBeInTheDocument();
		expect(screen.getByText("110 / 200g · 90g left")).toBeInTheDocument();

		const fills = container.querySelectorAll(".h-full.transition-all");
		expect(fills).toHaveLength(3);
		expect(parseFloat((fills[0] as HTMLElement).style.width)).toBeCloseTo(
			66.7222,
			3,
		);
		expect(parseFloat((fills[1] as HTMLElement).style.width)).toBeCloseTo(
			79.2857,
			3,
		);
		expect(parseFloat((fills[2] as HTMLElement).style.width)).toBeCloseTo(
			55.2,
			3,
		);
	});
});

describe("SavedMealBuilder", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createSavedMealAction.mockResolvedValue(undefined);
		updateSavedMealAction.mockResolvedValue(undefined);
	});

	it("validates the form before saving", async () => {
		render(<SavedMealBuilder foods={[]} initial={null} onClose={vi.fn()} />);

		fireEvent.click(screen.getByRole("button", { name: "Save" }));
		expect(await screen.findByText("Name is required")).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText("Name"), {
			target: { value: "Lunch Prep" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Save" }));
		expect(
			await screen.findByText("Add at least one food"),
		).toBeInTheDocument();
	});

	it("creates a saved meal from selected foods", async () => {
		const onClose = vi.fn();
		render(
			<SavedMealBuilder
				onClose={onClose}
				initial={null}
				foods={[
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
				]}
			/>,
		);

		expect(useEscapeKey).toHaveBeenCalledWith(onClose);
		fireEvent.change(screen.getByLabelText("Name"), {
			target: { value: "Protein Bowl" },
		});
		fireEvent.click(screen.getByRole("button", { name: /Greek Yogurt/ }));
		expect(
			screen.getByText("Total: 130 cal · P 23.0g · F 0.0g · C 9.0g"),
		).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText("servings"), {
			target: { value: "2.5" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() =>
			expect(createSavedMealAction).toHaveBeenCalledWith({
				name: "Protein Bowl",
				items: [{ foodItemId: "food-1", servings: 2.5 }],
			}),
		);
		expect(onClose).toHaveBeenCalled();
	});

	it("updates existing meals and rejects invalid servings", async () => {
		render(
			<SavedMealBuilder
				onClose={vi.fn()}
				foods={[
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
				]}
				initial={{
					id: "meal-1",
					name: "Breakfast Bowl",
					items: [
						{
							foodId: "food-1",
							foodName: "Greek Yogurt",
							servings: 1,
							calories: 130,
							proteinG: 23,
							fatG: 0,
							carbsG: 9,
						},
					],
					totals: {
						calories: 130,
						proteinG: 23,
						fatG: 0,
						carbsG: 9,
					},
				}}
			/>,
		);

		fireEvent.change(screen.getByLabelText("servings"), {
			target: { value: "" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Save" }));
		expect(
			await screen.findByText("Each food needs a valid servings value"),
		).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText("servings"), {
			target: { value: "3" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() =>
			expect(updateSavedMealAction).toHaveBeenCalledWith("meal-1", {
				name: "Breakfast Bowl",
				items: [{ foodItemId: "food-1", servings: 3 }],
			}),
		);
	});

	it("shows the empty-food helper, filters foods, removes items, and surfaces save failures", async () => {
		const { unmount } = render(
			<SavedMealBuilder foods={[]} initial={null} onClose={vi.fn()} />,
		);

		expect(
			screen.getByText("Create some food items on the Foods page first."),
		).toBeInTheDocument();

		unmount();
		createSavedMealAction.mockRejectedValueOnce(new Error("Save failed"));

		render(
			<SavedMealBuilder
				onClose={vi.fn()}
				initial={null}
				foods={[
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
				]}
			/>,
		);

		fireEvent.change(screen.getByLabelText("Name"), {
			target: { value: "Protein Bowl" },
		});
		fireEvent.change(screen.getByPlaceholderText("Search foods…"), {
			target: { value: "fage" },
		});

		expect(
			screen.getByRole("button", { name: /Greek Yogurt/i }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /Chicken Bowl/i }),
		).not.toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: /Greek Yogurt/i }));
		fireEvent.click(screen.getByRole("button", { name: "Remove" }));
		expect(screen.getByText("No foods added yet.")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: /Greek Yogurt/i }));
		fireEvent.click(screen.getByRole("button", { name: "Save" }));

		expect(await screen.findByText("Save failed")).toBeInTheDocument();
	});
});
