import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsView } from "@/components/settings-view";
import { calcPlan } from "@/lib/tdee";

const { saveProfileAction, importDataAction } = vi.hoisted(() => ({
	saveProfileAction: vi.fn(),
	importDataAction: vi.fn(),
}));

vi.mock("@/app/(app)/settings/actions", () => ({
	saveProfileAction,
	importDataAction,
}));

function buildProfile(
	overrides?: Partial<Parameters<typeof SettingsView>[0]["profile"]>,
) {
	return {
		name: "Tony",
		email: "tony@example.com",
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
		...overrides,
	};
}

function getDailyTargetsSection() {
	const section = screen.getByText("Daily targets").closest("section");
	expect(section).not.toBeNull();
	if (!section) {
		throw new Error("Expected daily targets section");
	}
	return section;
}

function getRecalcWeightInput(section: Element) {
	const input = section.querySelector('input[type="text"]');
	expect(input).not.toBeNull();
	if (!(input instanceof HTMLInputElement)) {
		throw new Error("Expected recalculation weight input");
	}
	return input;
}

describe("SettingsView", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		saveProfileAction.mockResolvedValue(undefined);
		importDataAction.mockResolvedValue({
			foods: 2,
			weights: 3,
			savedMeals: 1,
			mealLogs: 4,
		});
	});

	it("shows system theme guidance when no saved preference exists and renders export/import controls", () => {
		const { container } = render(
			<SettingsView
				profile={buildProfile({ themePreference: null, timezone: null })}
			/>,
		);

		expect(
			screen.getByText(
				/No saved preference yet\. Right now this device is using/i,
			),
		).toBeInTheDocument();
		expect(screen.getAllByText("dark").length).toBeGreaterThan(0);
		expect(screen.getByRole("link", { name: "Download JSON" })).toHaveAttribute(
			"href",
			"/settings/export",
		);
		expect(
			container.querySelector('input[type="file"][accept="application/json"]'),
		).not.toBeNull();
	});

	it("recalculates targets from the current weight input", () => {
		render(<SettingsView profile={buildProfile()} />);
		const dailyTargetsSection = getDailyTargetsSection();

		fireEvent.change(getRecalcWeightInput(dailyTargetsSection), {
			target: { value: "205" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Recalc" }));

		const plan = calcPlan({
			sex: "male",
			dateOfBirth: new Date("1990-04-19T00:00:00Z"),
			heightIn: 70,
			weightLbs: 205,
			activityLevel: "moderate",
			weightGoalLbsPerWeek: -1,
		});

		expect(
			screen.getByDisplayValue(plan.targetCalories.toString()),
		).toBeInTheDocument();
		expect(
			screen.getByDisplayValue(plan.proteinG.toString()),
		).toBeInTheDocument();
		expect(screen.getByDisplayValue(plan.fatG.toString())).toBeInTheDocument();
		expect(
			screen.getByDisplayValue(plan.carbsG.toString()),
		).toBeInTheDocument();
	});

	it("shows recalc errors when profile data is incomplete", async () => {
		render(<SettingsView profile={buildProfile({ dateOfBirth: null })} />);
		const dailyTargetsSection = getDailyTargetsSection();

		fireEvent.change(getRecalcWeightInput(dailyTargetsSection), {
			target: { value: "205" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Recalc" }));

		expect(
			await screen.findByText("Date of birth required to calculate TDEE"),
		).toBeInTheDocument();
	});

	it("saves the profile with parsed numbers and the selected theme", async () => {
		render(<SettingsView profile={buildProfile({ themePreference: null })} />);

		const profileSection = screen.getByText("Profile").closest("section");
		const dailyTargetsSection = screen
			.getByText("Daily targets")
			.closest("section");
		expect(profileSection).not.toBeNull();
		expect(dailyTargetsSection).not.toBeNull();
		if (!profileSection || !dailyTargetsSection) {
			throw new Error("Expected settings sections");
		}

		fireEvent.change(within(profileSection).getByDisplayValue("Tony"), {
			target: { value: "Anthony" },
		});
		fireEvent.change(within(profileSection).getByDisplayValue("70"), {
			target: { value: "72" },
		});
		fireEvent.change(
			within(profileSection).getByDisplayValue("America/Chicago"),
			{
				target: { value: "America/New_York" },
			},
		);
		fireEvent.click(screen.getByRole("button", { name: "light" }));
		fireEvent.change(within(dailyTargetsSection).getByDisplayValue("2200"), {
			target: { value: "2300" },
		});
		fireEvent.change(within(dailyTargetsSection).getByDisplayValue("180"), {
			target: { value: "185" },
		});
		fireEvent.change(within(dailyTargetsSection).getByDisplayValue("70"), {
			target: { value: "75" },
		});
		fireEvent.change(within(dailyTargetsSection).getByDisplayValue("190"), {
			target: { value: "210" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

		await waitFor(() =>
			expect(saveProfileAction).toHaveBeenCalledWith({
				name: "Anthony",
				sex: "male",
				dateOfBirth: "1990-04-19",
				heightIn: 72,
				activityLevel: "moderate",
				weightGoalLbsPerWeek: -1,
				targetCalories: 2300,
				targetProteinG: 185,
				targetFatG: 75,
				targetCarbsG: 210,
				timezone: "America/New_York",
				themePreference: "light",
			}),
		);
		expect(await screen.findByText("Saved.")).toBeInTheDocument();
	});

	it("shows validation and save errors", async () => {
		render(<SettingsView profile={buildProfile()} />);
		const dailyTargetsSection = getDailyTargetsSection();
		const targetInputs = within(dailyTargetsSection).getAllByRole("spinbutton");

		fireEvent.change(targetInputs[0], {
			target: { value: "" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

		expect(await screen.findByText("Calories is required")).toBeInTheDocument();
		expect(saveProfileAction).not.toHaveBeenCalled();

		fireEvent.change(targetInputs[0], {
			target: { value: "2200" },
		});
		saveProfileAction.mockRejectedValueOnce(new Error("Failed to save"));
		fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

		expect(await screen.findByText("Failed to save")).toBeInTheDocument();
	});

	it("imports JSON and reports success or failure", async () => {
		const { container, rerender } = render(
			<SettingsView profile={buildProfile()} />,
		);
		const input = container.querySelector('input[type="file"]');
		expect(input).not.toBeNull();
		if (!input) {
			throw new Error("Expected import file input");
		}

		const successFile = new File(['{"ok":true}'], "export.json", {
			type: "application/json",
		});
		fireEvent.change(input, { target: { files: [successFile] } });

		expect(
			await screen.findByText(
				"Imported 2 foods, 3 weights, 1 saved meals, 4 meal logs.",
			),
		).toBeInTheDocument();
		expect(importDataAction).toHaveBeenCalledWith('{"ok":true}');

		importDataAction.mockRejectedValueOnce(new Error("Bad import"));
		rerender(<SettingsView profile={buildProfile()} />);
		const nextInput = container.querySelector('input[type="file"]');
		expect(nextInput).not.toBeNull();
		if (!nextInput) {
			throw new Error("Expected import file input");
		}
		const badFile = new File(["oops"], "bad.json", {
			type: "application/json",
		});
		fireEvent.change(nextInput, { target: { files: [badFile] } });

		expect(await screen.findByText("Bad import")).toBeInTheDocument();
	});
});
