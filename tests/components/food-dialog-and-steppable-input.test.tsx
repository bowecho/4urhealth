import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import type React from "react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FoodDialog } from "@/components/food-dialog";
import { SteppableNumberInput } from "@/components/steppable-number-input";

const { useEscapeKey } = vi.hoisted(() => ({
	useEscapeKey: vi.fn(),
}));

vi.mock("@/lib/use-escape-key", () => ({
	useEscapeKey,
}));

vi.mock("@/components/modal-shell", () => ({
	ModalShell: ({
		children,
		onClose,
	}: {
		children: React.ReactNode;
		onClose: () => void;
	}) => (
		<button type="button" data-testid="modal-shell" onClick={onClose}>
			{children}
		</button>
	),
}));

describe("SteppableNumberInput", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("accepts numeric drafts and rejects invalid ones", () => {
		const onChange = vi.fn();
		render(
			<SteppableNumberInput
				value=""
				onChange={onChange}
				min={0.01}
				inputClassName="field"
				ariaLabel="servings"
			/>,
		);

		const input = screen.getByLabelText("servings");
		fireEvent.change(input, { target: { value: "1.25" } });
		fireEvent.change(input, { target: { value: "abc" } });
		fireEvent.change(input, { target: { value: "." } });

		expect(onChange).toHaveBeenNthCalledWith(1, "1.25");
		expect(onChange).toHaveBeenNthCalledWith(2, ".");
		expect(onChange).toHaveBeenCalledTimes(2);
	});

	it("nudges values with buttons and arrow keys while respecting the minimum", () => {
		function Harness() {
			const [value, setValue] = useState("1");
			return (
				<SteppableNumberInput
					value={value}
					onChange={setValue}
					min={0.5}
					inputClassName="field"
					ariaLabel="servings"
				/>
			);
		}

		render(<Harness />);
		const input = screen.getByLabelText("servings");
		const field = input.closest("div");
		expect(field).not.toBeNull();
		if (!field) throw new Error("Expected steppable field");

		fireEvent.click(within(field).getByRole("button", { name: "Increase" }));
		expect(input).toHaveValue("2");

		fireEvent.keyDown(input, { key: "ArrowDown" });
		expect(input).toHaveValue("1");

		fireEvent.change(input, { target: { value: "" } });
		fireEvent.keyDown(input, { key: "ArrowDown" });
		expect(input).toHaveValue("0.5");
	});
});

describe("FoodDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders inside the modal shell by default and registers escape handling", () => {
		render(<FoodDialog initial={null} onSubmit={vi.fn()} onCancel={vi.fn()} />);

		expect(screen.getByTestId("modal-shell")).toBeInTheDocument();
		expect(useEscapeKey).toHaveBeenCalledWith(expect.any(Function));
		expect(
			screen.getByRole("heading", { name: "New food" }),
		).toBeInTheDocument();
	});

	it("renders embedded mode with custom title, description, and servings field", async () => {
		const onSubmit = vi.fn().mockResolvedValue(undefined);
		const onServingsChange = vi.fn();
		const onCancel = vi.fn();
		render(
			<FoodDialog
				embedded
				initial={{
					name: "Greek Yogurt",
					brand: "Fage",
					servingSize: 1,
					servingUnit: "cup",
					calories: 130,
					proteinG: 23,
					fatG: 0,
					carbsG: 9,
				}}
				title="Quick add"
				description="Use this inline editor."
				submitLabel="Add food"
				servingsField={{
					value: "2",
					onChange: onServingsChange,
					label: "Meal servings",
				}}
				onSubmit={onSubmit}
				onCancel={onCancel}
			/>,
		);

		expect(screen.queryByTestId("modal-shell")).not.toBeInTheDocument();
		expect(screen.getByText("Use this inline editor.")).toBeInTheDocument();
		fireEvent.change(screen.getByLabelText("Meal servings"), {
			target: { value: "2.5" },
		});
		expect(onServingsChange).toHaveBeenCalledWith("2.5");

		fireEvent.click(screen.getByRole("button", { name: "Add food" }));

		await waitFor(() =>
			expect(onSubmit).toHaveBeenCalledWith({
				name: "Greek Yogurt",
				brand: "Fage",
				servingSize: 1,
				servingUnit: "cup",
				calories: 130,
				proteinG: 23,
				fatG: 0,
				carbsG: 9,
			}),
		);
	});

	it("shows validation and submit errors and allows cancellation", async () => {
		const onSubmit = vi.fn().mockRejectedValueOnce(new Error("Save failed"));
		const onCancel = vi.fn();
		render(
			<FoodDialog initial={null} onSubmit={onSubmit} onCancel={onCancel} />,
		);
		const form = screen.getByRole("button", { name: "Save" }).closest("form");
		if (!form) throw new Error("Expected food dialog form");

		fireEvent.change(screen.getByLabelText("Name"), {
			target: { value: "Greek Yogurt" },
		});
		fireEvent.change(screen.getByLabelText("Serving size"), {
			target: { value: "" },
		});
		fireEvent.submit(form);
		expect(
			await screen.findByText("Serving size is required"),
		).toBeInTheDocument();
		expect(onSubmit).not.toHaveBeenCalled();

		fireEvent.change(screen.getByLabelText("Serving size"), {
			target: { value: "1" },
		});
		fireEvent.submit(form);
		expect(await screen.findByText("Save failed")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
		expect(onCancel).toHaveBeenCalled();
	});
});
