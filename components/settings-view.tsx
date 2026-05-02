"use client";
import {
	type ReactNode,
	useEffect,
	useId,
	useRef,
	useState,
	useTransition,
} from "react";
import {
	type ImportSummary,
	importDataAction,
	saveProfileAction,
} from "@/app/(app)/settings/actions";
import { SteppableNumberInput } from "@/components/steppable-number-input";
import { parseRequiredNumber } from "@/lib/form";
import { ACTIVITY_LABELS, type ActivityLevel, calcPlan } from "@/lib/tdee";
import type { ThemePreference } from "@/lib/theme";

type Profile = {
	name: string;
	email: string;
	sex: "male" | "female" | null;
	dateOfBirth: string | null;
	heightIn: number | null;
	activityLevel: ActivityLevel | null;
	weightGoalLbsPerWeek: number | null;
	targetCalories: number | null;
	targetProteinG: number | null;
	targetFatG: number | null;
	targetCarbsG: number | null;
	timezone: string | null;
	themePreference: ThemePreference | null;
};

const inputCls =
	"theme-input w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

const selectCls = `${inputCls} h-11 pr-10`;

export function SettingsView({ profile }: { profile: Profile }) {
	const [name, setName] = useState(profile.name);
	const [sex, setSex] = useState<"male" | "female">(profile.sex ?? "male");
	const [dateOfBirth, setDateOfBirth] = useState(profile.dateOfBirth ?? "");
	const [heightIn, setHeightIn] = useState((profile.heightIn ?? 68).toString());
	const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
		profile.activityLevel ?? "moderate",
	);
	const [weightGoal, setWeightGoal] = useState(
		(profile.weightGoalLbsPerWeek ?? -1).toString(),
	);
	const [targetCalories, setTargetCalories] = useState(
		(profile.targetCalories ?? 2000).toString(),
	);
	const [targetProteinG, setTargetProteinG] = useState(
		(profile.targetProteinG ?? 150).toString(),
	);
	const [targetFatG, setTargetFatG] = useState(
		(profile.targetFatG ?? 60).toString(),
	);
	const [targetCarbsG, setTargetCarbsG] = useState(
		(profile.targetCarbsG ?? 200).toString(),
	);
	const [timezone, setTimezone] = useState(
		profile.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
	);
	const [themePreference, setThemePreference] =
		useState<ThemePreference | null>(profile.themePreference);
	const [saveMsg, setSaveMsg] = useState<string | null>(null);
	const [saveErr, setSaveErr] = useState<string | null>(null);
	const [saving, startSave] = useTransition();
	const heightId = useId();
	const weightGoalId = useId();
	const systemThemePreference = useSystemThemePreference();
	const resolvedThemePreference = themePreference ?? systemThemePreference;

	function handleSave() {
		setSaveMsg(null);
		setSaveErr(null);
		startSave(async () => {
			try {
				await saveProfileAction({
					name,
					sex,
					dateOfBirth,
					heightIn: parseRequiredNumber(heightIn, "Height"),
					activityLevel,
					weightGoalLbsPerWeek: parseRequiredNumber(weightGoal, "Goal"),
					targetCalories: parseRequiredNumber(targetCalories, "Calories"),
					targetProteinG: parseRequiredNumber(targetProteinG, "Protein"),
					targetFatG: parseRequiredNumber(targetFatG, "Fat"),
					targetCarbsG: parseRequiredNumber(targetCarbsG, "Carbs"),
					timezone,
					themePreference: resolvedThemePreference,
				});
				setSaveMsg("Saved.");
			} catch (err) {
				setSaveErr(err instanceof Error ? err.message : "Failed to save");
			}
		});
	}

	function handleRecalc(estimatedWeightLbs: number) {
		try {
			const plan = buildCalculatedPlan({
				sex,
				dateOfBirth,
				heightIn,
				activityLevel,
				weightGoal,
				estimatedWeightLbs,
			});
			setTargetCalories(plan.targetCalories);
			setTargetProteinG(plan.targetProteinG);
			setTargetFatG(plan.targetFatG);
			setTargetCarbsG(plan.targetCarbsG);
			setSaveErr(null);
		} catch (err) {
			setSaveErr(
				err instanceof Error ? err.message : "Failed to calculate targets",
			);
		}
	}

	return (
		<div className="space-y-8">
			<SettingsHeader />

			<ProfileSection
				email={profile.email}
				name={name}
				onNameChange={setName}
				sex={sex}
				onSexChange={setSex}
				dateOfBirth={dateOfBirth}
				onDateOfBirthChange={setDateOfBirth}
				heightIn={heightIn}
				onHeightInChange={setHeightIn}
				heightId={heightId}
				activityLevel={activityLevel}
				onActivityLevelChange={setActivityLevel}
				weightGoal={weightGoal}
				onWeightGoalChange={setWeightGoal}
				weightGoalId={weightGoalId}
				timezone={timezone}
				onTimezoneChange={setTimezone}
			/>

			<DailyTargetsSection
				targetCalories={targetCalories}
				onTargetCaloriesChange={setTargetCalories}
				targetProteinG={targetProteinG}
				onTargetProteinGChange={setTargetProteinG}
				targetFatG={targetFatG}
				onTargetFatGChange={setTargetFatG}
				targetCarbsG={targetCarbsG}
				onTargetCarbsGChange={setTargetCarbsG}
				onRecalc={handleRecalc}
			/>

			<ThemeSection
				onThemePreferenceChange={setThemePreference}
				resolvedThemePreference={resolvedThemePreference}
				systemThemePreference={systemThemePreference}
				hasSavedThemePreference={profile.themePreference !== null}
			/>

			<SaveSection
				onSave={handleSave}
				saving={saving}
				saveMsg={saveMsg}
				saveErr={saveErr}
			/>

			<ExportSection />
			<ImportSection />
		</div>
	);
}

function useSystemThemePreference(): ThemePreference {
	const [systemThemePreference, setSystemThemePreference] =
		useState<ThemePreference>("dark");

	useEffect(() => {
		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const update = () => {
			setSystemThemePreference(media.matches ? "dark" : "light");
		};
		update();
		media.addEventListener("change", update);
		return () => media.removeEventListener("change", update);
	}, []);

	return systemThemePreference;
}

function buildCalculatedPlan({
	sex,
	dateOfBirth,
	heightIn,
	activityLevel,
	weightGoal,
	estimatedWeightLbs,
}: {
	sex: "male" | "female";
	dateOfBirth: string;
	heightIn: string;
	activityLevel: ActivityLevel;
	weightGoal: string;
	estimatedWeightLbs: number;
}) {
	if (!dateOfBirth) {
		throw new Error("Date of birth required to calculate TDEE");
	}

	const parsedHeightIn = Number(heightIn);
	const parsedWeightGoal = Number(weightGoal);
	if (!Number.isFinite(parsedHeightIn) || !Number.isFinite(parsedWeightGoal)) {
		throw new Error("Height and goal are required to calculate TDEE");
	}

	const plan = calcPlan({
		sex,
		dateOfBirth: new Date(`${dateOfBirth}T00:00:00Z`),
		heightIn: parsedHeightIn,
		weightLbs: estimatedWeightLbs,
		activityLevel,
		weightGoalLbsPerWeek: parsedWeightGoal,
	});

	return {
		targetCalories: plan.targetCalories.toString(),
		targetProteinG: plan.proteinG.toString(),
		targetFatG: plan.fatG.toString(),
		targetCarbsG: plan.carbsG.toString(),
	};
}

function SettingsHeader() {
	return (
		<div className="space-y-2">
			<h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
			<p className="max-w-2xl text-sm text-zinc-500">
				Keep your targets, timezone, and theme aligned with how you actually use
				the app day to day.
			</p>
		</div>
	);
}

function ProfileSection({
	email,
	name,
	onNameChange,
	sex,
	onSexChange,
	dateOfBirth,
	onDateOfBirthChange,
	heightIn,
	onHeightInChange,
	heightId,
	activityLevel,
	onActivityLevelChange,
	weightGoal,
	onWeightGoalChange,
	weightGoalId,
	timezone,
	onTimezoneChange,
}: {
	email: string;
	name: string;
	onNameChange: (value: string) => void;
	sex: "male" | "female";
	onSexChange: (value: "male" | "female") => void;
	dateOfBirth: string;
	onDateOfBirthChange: (value: string) => void;
	heightIn: string;
	onHeightInChange: (value: string) => void;
	heightId: string;
	activityLevel: ActivityLevel;
	onActivityLevelChange: (value: ActivityLevel) => void;
	weightGoal: string;
	onWeightGoalChange: (value: string) => void;
	weightGoalId: string;
	timezone: string;
	onTimezoneChange: (value: string) => void;
}) {
	return (
		<SectionCard
			title="Profile"
			description="Basic details used to estimate calorie and macro targets."
		>
			<p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
				{email}
			</p>

			<div className="grid sm:grid-cols-2 gap-3">
				<Field label="Name">
					<input
						type="text"
						value={name}
						onChange={(e) => onNameChange(e.target.value)}
						className={inputCls}
					/>
				</Field>
				<Field label="Sex">
					<select
						value={sex}
						onChange={(e) => onSexChange(e.target.value as "male" | "female")}
						className={selectCls}
					>
						<option value="male">Male</option>
						<option value="female">Female</option>
					</select>
				</Field>
				<Field label="Date of birth">
					<input
						type="date"
						value={dateOfBirth}
						onChange={(e) => onDateOfBirthChange(e.target.value)}
						className={inputCls}
					/>
				</Field>
				<Field label="Height (in)">
					<SteppableNumberInput
						id={heightId}
						value={heightIn}
						onChange={onHeightInChange}
						min={36}
						inputClassName={`${inputCls} pr-10`}
					/>
				</Field>
				<Field label="Activity">
					<select
						value={activityLevel}
						onChange={(e) =>
							onActivityLevelChange(e.target.value as ActivityLevel)
						}
						className={selectCls}
					>
						{Object.entries(ACTIVITY_LABELS).map(([key, label]) => (
							<option key={key} value={key}>
								{label}
							</option>
						))}
					</select>
				</Field>
				<Field label="Goal (lbs/week)">
					<SteppableNumberInput
						id={weightGoalId}
						value={weightGoal}
						onChange={onWeightGoalChange}
						min={-2}
						inputClassName={`${inputCls} pr-10`}
					/>
				</Field>
				<Field label="Timezone">
					<input
						type="text"
						value={timezone}
						onChange={(e) => onTimezoneChange(e.target.value)}
						className={inputCls}
					/>
				</Field>
			</div>
		</SectionCard>
	);
}

function DailyTargetsSection({
	targetCalories,
	onTargetCaloriesChange,
	targetProteinG,
	onTargetProteinGChange,
	targetFatG,
	onTargetFatGChange,
	targetCarbsG,
	onTargetCarbsGChange,
	onRecalc,
}: {
	targetCalories: string;
	onTargetCaloriesChange: (value: string) => void;
	targetProteinG: string;
	onTargetProteinGChange: (value: string) => void;
	targetFatG: string;
	onTargetFatGChange: (value: string) => void;
	targetCarbsG: string;
	onTargetCarbsGChange: (value: string) => void;
	onRecalc: (weightLbs: number) => void;
}) {
	return (
		<SectionCard
			title="Daily targets"
			description="Manually tune these, or recalc them from your current weight."
		>
			<div className="flex items-end justify-between gap-2 flex-wrap">
				<div>
					<h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
						Calculated plan
					</h3>
					<p className="text-xs text-zinc-500">
						Use these as defaults, then adjust if your real-world intake needs
						fine tuning.
					</p>
				</div>
				<RecalcButton onRecalc={onRecalc} />
			</div>
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<Field label="Calories">
					<input
						type="number"
						min={1000}
						max={6000}
						value={targetCalories}
						onChange={(e) => onTargetCaloriesChange(e.target.value)}
						className={inputCls}
					/>
				</Field>
				<Field label="Protein (g)">
					<input
						type="number"
						min={0}
						max={500}
						value={targetProteinG}
						onChange={(e) => onTargetProteinGChange(e.target.value)}
						className={inputCls}
					/>
				</Field>
				<Field label="Fat (g)">
					<input
						type="number"
						min={0}
						max={300}
						value={targetFatG}
						onChange={(e) => onTargetFatGChange(e.target.value)}
						className={inputCls}
					/>
				</Field>
				<Field label="Carbs (g)">
					<input
						type="number"
						min={0}
						max={800}
						value={targetCarbsG}
						onChange={(e) => onTargetCarbsGChange(e.target.value)}
						className={inputCls}
					/>
				</Field>
			</div>
		</SectionCard>
	);
}

function ThemeSection({
	onThemePreferenceChange,
	resolvedThemePreference,
	systemThemePreference,
	hasSavedThemePreference,
}: {
	onThemePreferenceChange: (value: ThemePreference) => void;
	resolvedThemePreference: ThemePreference;
	systemThemePreference: ThemePreference;
	hasSavedThemePreference: boolean;
}) {
	return (
		<SectionCard
			title="Theme"
			description="Choose how the app should look the next time you come back."
		>
			<div className="inline-flex rounded-lg border border-zinc-300 dark:border-zinc-700 p-1 gap-1">
				{(["light", "dark"] as const).map((option) => {
					const active = resolvedThemePreference === option;
					return (
						<button
							key={option}
							type="button"
							onClick={() => onThemePreferenceChange(option)}
							className={`rounded-md px-3 py-2 text-sm font-medium capitalize ${
								active
									? "theme-active-pill"
									: "text-zinc-600 hover:bg-[var(--accent-soft)] dark:text-zinc-400 dark:hover:bg-[var(--accent-soft)]"
							}`}
							aria-pressed={active}
						>
							{option}
						</button>
					);
				})}
			</div>
			{hasSavedThemePreference ? null : (
				<p className="text-xs text-zinc-500">
					No saved preference yet. Right now this device is using{" "}
					<span className="font-medium capitalize">
						{systemThemePreference}
					</span>
					.
				</p>
			)}
		</SectionCard>
	);
}

function SaveSection({
	onSave,
	saving,
	saveMsg,
	saveErr,
}: {
	onSave: () => void;
	saving: boolean;
	saveMsg: string | null;
	saveErr: string | null;
}) {
	return (
		<div className="theme-surface rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<p className="text-sm font-medium">Ready to save?</p>
					<p className="text-xs text-zinc-500">
						Changes apply immediately and will be there the next time you open
						the app.
					</p>
				</div>
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={onSave}
						disabled={saving}
						className="theme-primary-button rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
					>
						{saving ? "Saving…" : "Save profile"}
					</button>
					{saveMsg ? (
						<p className="text-sm text-emerald-600">{saveMsg}</p>
					) : null}
					{saveErr ? <p className="text-sm text-red-600">{saveErr}</p> : null}
				</div>
			</div>
		</div>
	);
}

function ExportSection() {
	return (
		<SectionCard
			title="Export"
			description="Download your foods, weights, saved meals, and meal logs as JSON."
		>
			<a
				href="/settings/export"
				className="theme-secondary-button inline-block rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
			>
				Download JSON
			</a>
		</SectionCard>
	);
}

function SectionCard({
	title,
	description,
	children,
}: {
	title: string;
	description: string;
	children: ReactNode;
}) {
	return (
		<section className="theme-surface rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
			<div className="mb-4 space-y-1">
				<h2 className="text-lg font-semibold tracking-tight">{title}</h2>
				<p className="text-sm text-zinc-500">{description}</p>
			</div>
			<div className="space-y-4">{children}</div>
		</section>
	);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="block">
			<div className="block text-xs font-medium mb-1 text-zinc-600 dark:text-zinc-400">
				{label}
			</div>
			{children}
		</div>
	);
}

function RecalcButton({ onRecalc }: { onRecalc: (weightLbs: number) => void }) {
	const [weight, setWeight] = useState("");
	const weightId = useId();

	return (
		<div className="flex items-end gap-2">
			<Field label="Current weight (lb)">
				<SteppableNumberInput
					id={weightId}
					value={weight}
					onChange={setWeight}
					min={60}
					inputClassName={`${inputCls} pr-10`}
				/>
			</Field>
			<button
				type="button"
				onClick={() => {
					const parsedWeight = Number(weight);
					if (Number.isFinite(parsedWeight) && parsedWeight > 0) {
						onRecalc(parsedWeight);
					}
				}}
				className="theme-secondary-button rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
			>
				Recalc
			</button>
		</div>
	);
}

function ImportSection() {
	const inputRef = useRef<HTMLInputElement>(null);
	const [summary, setSummary] = useState<ImportSummary | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	function handleFile(file: File) {
		setError(null);
		setSummary(null);
		startTransition(async () => {
			try {
				const text = await file.text();
				const result = await importDataAction(text);
				setSummary(result);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Import failed");
			}
		});
	}

	return (
		<SectionCard
			title="Import"
			description="Upload a JSON file previously exported. Records are added, not replaced; weights upsert by date."
		>
			<input
				ref={inputRef}
				type="file"
				accept="application/json"
				className="hidden"
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (file) handleFile(file);
					e.target.value = "";
				}}
			/>
			<button
				type="button"
				onClick={() => inputRef.current?.click()}
				disabled={pending}
				className="theme-secondary-button inline-block rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-50"
			>
				{pending ? "Importing…" : "Choose JSON file"}
			</button>
			{summary ? (
				<p className="text-sm text-emerald-600">
					Imported {summary.foods} foods, {summary.weights} weights,{" "}
					{summary.savedMeals} saved meals, {summary.mealLogs} meal logs.
				</p>
			) : null}
			{error ? <p className="text-sm text-red-600">{error}</p> : null}
		</SectionCard>
	);
}
