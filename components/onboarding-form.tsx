"use client";
import { unstable_rethrow } from "next/navigation";
import { type FormEvent, useMemo, useState, useTransition } from "react";
import { saveOnboardingAction } from "@/app/onboarding/actions";
import {
	ACTIVITY_LABELS,
	type ActivityLevel,
	calcPlan,
	type Sex,
} from "@/lib/tdee";

const INPUT =
	"w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100 dark:focus:ring-zinc-100";
const LABEL = "block text-sm font-medium mb-1";
const HELP = "mt-1 text-xs text-zinc-500";

const WEIGHT_GOALS = [
	{ value: -2, label: "Lose 2 lb / week (aggressive)" },
	{ value: -1.5, label: "Lose 1.5 lb / week" },
	{ value: -1, label: "Lose 1 lb / week (recommended)" },
	{ value: -0.5, label: "Lose 0.5 lb / week (gentle)" },
	{ value: 0, label: "Maintain" },
	{ value: 0.5, label: "Gain 0.5 lb / week" },
	{ value: 1, label: "Gain 1 lb / week" },
];

const ACTIVITY_OPTIONS: ActivityLevel[] = [
	"sedentary",
	"light",
	"moderate",
	"active",
	"very_active",
];

type Step = "profile" | "plan";

export function OnboardingForm() {
	const [step, setStep] = useState<Step>("profile");
	const [sex, setSex] = useState<Sex>("male");
	const [dateOfBirth, setDateOfBirth] = useState("");
	const [heightFt, setHeightFt] = useState(5);
	const [heightInches, setHeightInches] = useState(10);
	const [weightLbs, setWeightLbs] = useState(180);
	const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");
	const [weightGoal, setWeightGoal] = useState(-1);

	const heightIn = heightFt * 12 + heightInches;

	const plan = useMemo(() => {
		if (!dateOfBirth) return null;
		try {
			return calcPlan({
				sex,
				dateOfBirth: new Date(dateOfBirth),
				heightIn,
				weightLbs,
				activityLevel,
				weightGoalLbsPerWeek: weightGoal,
			});
		} catch {
			return null;
		}
	}, [sex, dateOfBirth, heightIn, weightLbs, activityLevel, weightGoal]);

	const [targetCalories, setTargetCalories] = useState<number | null>(null);
	const [targetProtein, setTargetProtein] = useState<number | null>(null);
	const [targetFat, setTargetFat] = useState<number | null>(null);
	const [targetCarbs, setTargetCarbs] = useState<number | null>(null);

	const effCalories = targetCalories ?? plan?.targetCalories ?? 0;
	const effProtein = targetProtein ?? plan?.proteinG ?? 0;
	const effFat = targetFat ?? plan?.fatG ?? 0;
	const effCarbs = targetCarbs ?? plan?.carbsG ?? 0;

	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function onReviewSubmit(e: FormEvent) {
		e.preventDefault();
		setError(null);
		if (!dateOfBirth) {
			setError("Date of birth is required");
			return;
		}
		if (heightIn < 36 || heightIn > 96) {
			setError("Height seems out of range");
			return;
		}
		setStep("plan");
	}

	function onFinalSubmit(e: FormEvent) {
		e.preventDefault();
		setError(null);
		const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
		startTransition(async () => {
			try {
				await saveOnboardingAction({
					sex,
					dateOfBirth,
					heightIn,
					weightLbs,
					activityLevel,
					weightGoalLbsPerWeek: weightGoal,
					targetCalories: effCalories,
					targetProteinG: effProtein,
					targetFatG: effFat,
					targetCarbsG: effCarbs,
					timezone,
				});
			} catch (err) {
				unstable_rethrow(err);
				setError(err instanceof Error ? err.message : "Failed to save");
			}
		});
	}

	if (step === "profile") {
		return (
			<form onSubmit={onReviewSubmit} className="space-y-5">
				<div>
					<span className={LABEL}>Sex</span>
					<div className="flex gap-3">
						{(["male", "female"] as Sex[]).map((s) => (
							<label
								key={s}
								className={`flex-1 text-center rounded-md border px-3 py-2 text-sm cursor-pointer capitalize ${
									sex === s
										? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
										: "border-zinc-300 dark:border-zinc-700"
								}`}
							>
								<input
									type="radio"
									name="sex"
									value={s}
									checked={sex === s}
									onChange={() => setSex(s)}
									className="sr-only"
								/>
								{s}
							</label>
						))}
					</div>
					<p className={HELP}>Used for the BMR formula.</p>
				</div>

				<div>
					<label htmlFor="dob" className={LABEL}>
						Date of birth
					</label>
					<input
						id="dob"
						type="date"
						required
						max={new Date().toISOString().slice(0, 10)}
						value={dateOfBirth}
						onChange={(e) => setDateOfBirth(e.target.value)}
						className={INPUT}
					/>
				</div>

				<div>
					<span className={LABEL}>Height</span>
					<div className="flex gap-3">
						<div className="flex-1">
							<input
								type="number"
								min={3}
								max={8}
								value={heightFt}
								onChange={(e) => setHeightFt(Number(e.target.value))}
								className={INPUT}
								aria-label="feet"
							/>
							<p className={HELP}>feet</p>
						</div>
						<div className="flex-1">
							<input
								type="number"
								min={0}
								max={11}
								value={heightInches}
								onChange={(e) => setHeightInches(Number(e.target.value))}
								className={INPUT}
								aria-label="inches"
							/>
							<p className={HELP}>inches</p>
						</div>
					</div>
				</div>

				<div>
					<label htmlFor="weight" className={LABEL}>
						Current weight (lbs)
					</label>
					<input
						id="weight"
						type="number"
						min={60}
						max={700}
						step={0.1}
						required
						value={weightLbs}
						onChange={(e) => setWeightLbs(Number(e.target.value))}
						className={INPUT}
					/>
				</div>

				<div>
					<label htmlFor="activity" className={LABEL}>
						Activity level
					</label>
					<select
						id="activity"
						value={activityLevel}
						onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
						className={INPUT}
					>
						{ACTIVITY_OPTIONS.map((a) => (
							<option key={a} value={a}>
								{ACTIVITY_LABELS[a]}
							</option>
						))}
					</select>
				</div>

				<div>
					<label htmlFor="goal" className={LABEL}>
						Goal
					</label>
					<select
						id="goal"
						value={weightGoal}
						onChange={(e) => setWeightGoal(Number(e.target.value))}
						className={INPUT}
					>
						{WEIGHT_GOALS.map((g) => (
							<option key={g.value} value={g.value}>
								{g.label}
							</option>
						))}
					</select>
				</div>

				{error ? <p className="text-sm text-red-600">{error}</p> : null}

				<button
					type="submit"
					className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
				>
					Calculate my plan
				</button>
			</form>
		);
	}

	return (
		<form onSubmit={onFinalSubmit} className="space-y-5">
			<div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-4 space-y-2 text-sm">
				<p className="text-zinc-600 dark:text-zinc-400">
					Based on your profile: BMR {plan?.bmr ?? "—"} cal, TDEE{" "}
					{plan?.tdee ?? "—"} cal.
				</p>
				<p className="text-zinc-600 dark:text-zinc-400">
					Edit any number to override the defaults.
				</p>
			</div>

			<div>
				<label htmlFor="cals" className={LABEL}>
					Daily calories
				</label>
				<input
					id="cals"
					type="number"
					min={1000}
					max={6000}
					value={effCalories}
					onChange={(e) => setTargetCalories(Number(e.target.value))}
					className={INPUT}
				/>
			</div>

			<div className="grid grid-cols-3 gap-3">
				<div>
					<label htmlFor="p" className={LABEL}>
						Protein (g)
					</label>
					<input
						id="p"
						type="number"
						min={0}
						max={500}
						value={effProtein}
						onChange={(e) => setTargetProtein(Number(e.target.value))}
						className={INPUT}
					/>
				</div>
				<div>
					<label htmlFor="f" className={LABEL}>
						Fat (g)
					</label>
					<input
						id="f"
						type="number"
						min={0}
						max={300}
						value={effFat}
						onChange={(e) => setTargetFat(Number(e.target.value))}
						className={INPUT}
					/>
				</div>
				<div>
					<label htmlFor="c" className={LABEL}>
						Carbs (g)
					</label>
					<input
						id="c"
						type="number"
						min={0}
						max={800}
						value={effCarbs}
						onChange={(e) => setTargetCarbs(Number(e.target.value))}
						className={INPUT}
					/>
				</div>
			</div>

			{error ? <p className="text-sm text-red-600">{error}</p> : null}

			<div className="flex gap-3">
				<button
					type="button"
					onClick={() => setStep("profile")}
					className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
				>
					Back
				</button>
				<button
					type="submit"
					disabled={isPending}
					className="flex-1 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
				>
					{isPending ? "Saving…" : "Save and get started"}
				</button>
			</div>
		</form>
	);
}
