import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingForm } from "@/components/onboarding-form";
import { calcPlan } from "@/lib/tdee";

const { saveOnboardingAction, unstable_rethrow } = vi.hoisted(() => ({
	saveOnboardingAction: vi.fn(),
	unstable_rethrow: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	unstable_rethrow,
}));

vi.mock("@/app/onboarding/actions", () => ({
	saveOnboardingAction,
}));

describe("OnboardingForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		saveOnboardingAction.mockResolvedValue(undefined);
		unstable_rethrow.mockImplementation(() => {});
		vi.spyOn(Intl, "DateTimeFormat").mockImplementation(
			() =>
				({
					resolvedOptions: () => ({ timeZone: "America/Chicago" }),
				}) as Intl.DateTimeFormat,
		);
	});

	it("validates profile input before moving to the plan step", async () => {
		render(<OnboardingForm />);

		const form = screen
			.getByRole("button", {
				name: "Calculate my plan",
			})
			.closest("form");
		if (!form) {
			throw new Error("Expected onboarding form");
		}

		fireEvent.submit(form);
		expect(
			await screen.findByText("Date of birth is required"),
		).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText("Date of birth"), {
			target: { value: "1990-01-01" },
		});
		fireEvent.change(screen.getByLabelText("feet"), {
			target: { value: "2" },
		});
		fireEvent.submit(form);
		expect(
			await screen.findByText("Height seems out of range"),
		).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText("feet"), {
			target: { value: "5" },
		});
		fireEvent.change(screen.getByLabelText("Current weight (lbs)"), {
			target: { value: "50" },
		});
		fireEvent.submit(form);
		expect(
			await screen.findByText("Weight seems out of range"),
		).toBeInTheDocument();
	});

	it("shows calculated defaults on the plan step and can go back", async () => {
		render(<OnboardingForm />);

		fireEvent.change(screen.getByLabelText("Date of birth"), {
			target: { value: "1990-01-01" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Calculate my plan" }));

		const plan = calcPlan({
			sex: "male",
			dateOfBirth: new Date("1990-01-01"),
			heightIn: 70,
			weightLbs: 180,
			activityLevel: "moderate",
			weightGoalLbsPerWeek: -1,
		});

		expect(
			await screen.findByText(/Based on your profile:/),
		).toBeInTheDocument();
		expect(screen.getByLabelText("Daily calories")).toHaveValue(
			plan.targetCalories,
		);
		expect(screen.getByLabelText("Protein (g)")).toHaveValue(plan.proteinG);
		expect(screen.getByLabelText("Fat (g)")).toHaveValue(plan.fatG);
		expect(screen.getByLabelText("Carbs (g)")).toHaveValue(plan.carbsG);

		fireEvent.click(screen.getByRole("button", { name: "Back" }));
		expect(
			screen.getByRole("button", { name: "Calculate my plan" }),
		).toBeInTheDocument();
	});

	it("submits the onboarding payload with manual overrides", async () => {
		render(<OnboardingForm />);

		fireEvent.change(screen.getByLabelText("Date of birth"), {
			target: { value: "1990-01-01" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Calculate my plan" }));
		await screen.findByText(/Based on your profile:/);

		fireEvent.change(screen.getByLabelText("Daily calories"), {
			target: { value: "2200" },
		});
		fireEvent.change(screen.getByLabelText("Protein (g)"), {
			target: { value: "180" },
		});
		fireEvent.change(screen.getByLabelText("Fat (g)"), {
			target: { value: "70" },
		});
		fireEvent.change(screen.getByLabelText("Carbs (g)"), {
			target: { value: "200" },
		});
		fireEvent.click(
			screen.getByRole("button", { name: "Save and get started" }),
		);

		await waitFor(() =>
			expect(saveOnboardingAction).toHaveBeenCalledWith({
				sex: "male",
				dateOfBirth: "1990-01-01",
				heightIn: 70,
				weightLbs: 180,
				activityLevel: "moderate",
				weightGoalLbsPerWeek: -1,
				targetCalories: 2200,
				targetProteinG: 180,
				targetFatG: 70,
				targetCarbsG: 200,
				timezone: "America/Chicago",
			}),
		);
	});

	it("shows validation errors from the plan step before calling the server", async () => {
		render(<OnboardingForm />);

		fireEvent.change(screen.getByLabelText("Date of birth"), {
			target: { value: "1990-01-01" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Calculate my plan" }));
		await screen.findByText(/Based on your profile:/);

		fireEvent.change(screen.getByLabelText("Daily calories"), {
			target: { value: "" },
		});
		fireEvent.click(
			screen.getByRole("button", { name: "Save and get started" }),
		);

		expect(
			await screen.findByText("Daily calories is required"),
		).toBeInTheDocument();
		expect(saveOnboardingAction).not.toHaveBeenCalled();
		expect(unstable_rethrow).toHaveBeenCalled();
	});

	it("shows server errors returned during save", async () => {
		saveOnboardingAction.mockRejectedValueOnce(new Error("Failed to save"));
		render(<OnboardingForm />);

		fireEvent.change(screen.getByLabelText("Date of birth"), {
			target: { value: "1990-01-01" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Calculate my plan" }));
		await screen.findByText(/Based on your profile:/);

		fireEvent.click(
			screen.getByRole("button", { name: "Save and get started" }),
		);

		expect(await screen.findByText("Failed to save")).toBeInTheDocument();
		expect(unstable_rethrow).toHaveBeenCalled();
	});
});
