export type Sex = "male" | "female";
export type ActivityLevel =
	| "sedentary"
	| "light"
	| "moderate"
	| "active"
	| "very_active";

const LB_TO_KG = 0.45359237;
const IN_TO_CM = 2.54;
const CAL_PER_LB_FAT_PER_WEEK = 500 * 7;

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
	sedentary: 1.2,
	light: 1.375,
	moderate: 1.55,
	active: 1.725,
	very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
	sedentary: "Sedentary — desk job, little exercise",
	light: "Light — exercise 1–3 days/week",
	moderate: "Moderate — exercise 3–5 days/week",
	active: "Active — exercise 6–7 days/week",
	very_active: "Very active — hard daily or physical job",
};

export function calcAge(dateOfBirth: Date, today: Date = new Date()): number {
	let age = today.getFullYear() - dateOfBirth.getFullYear();
	const m = today.getMonth() - dateOfBirth.getMonth();
	if (m < 0 || (m === 0 && today.getDate() < dateOfBirth.getDate())) age--;
	return age;
}

export function calcBmr(opts: {
	sex: Sex;
	weightLbs: number;
	heightIn: number;
	age: number;
}): number {
	const weightKg = opts.weightLbs * LB_TO_KG;
	const heightCm = opts.heightIn * IN_TO_CM;
	const base = 10 * weightKg + 6.25 * heightCm - 5 * opts.age;
	const offset = opts.sex === "male" ? 5 : -161;
	return Math.round(base + offset);
}

export function calcTdee(opts: {
	bmr: number;
	activityLevel: ActivityLevel;
}): number {
	return Math.round(opts.bmr * ACTIVITY_MULTIPLIERS[opts.activityLevel]);
}

/**
 * weightGoalLbsPerWeek: negative for deficit (e.g. -1 loses 1 lb/week), positive for surplus.
 */
export function calcTargetCalories(opts: {
	tdee: number;
	weightGoalLbsPerWeek: number;
}): number {
	const dailyAdjustment =
		(opts.weightGoalLbsPerWeek * CAL_PER_LB_FAT_PER_WEEK) / 7;
	return Math.max(1200, Math.round(opts.tdee + dailyAdjustment));
}

/**
 * Defaults: protein 0.8 g/lb bodyweight, fat 0.3 g/lb, carbs fill remainder.
 * Floors carbs at 0.
 */
export function calcDefaultMacros(opts: {
	weightLbs: number;
	targetCalories: number;
}): { proteinG: number; fatG: number; carbsG: number } {
	const proteinG = Math.round(opts.weightLbs * 0.8);
	const fatG = Math.round(opts.weightLbs * 0.3);
	const caloriesFromPF = proteinG * 4 + fatG * 9;
	const carbsG = Math.max(
		0,
		Math.round((opts.targetCalories - caloriesFromPF) / 4),
	);
	return { proteinG, fatG, carbsG };
}

export function calcPlan(opts: {
	sex: Sex;
	dateOfBirth: Date;
	heightIn: number;
	weightLbs: number;
	activityLevel: ActivityLevel;
	weightGoalLbsPerWeek: number;
	today?: Date;
}) {
	const age = calcAge(opts.dateOfBirth, opts.today);
	const bmr = calcBmr({
		sex: opts.sex,
		weightLbs: opts.weightLbs,
		heightIn: opts.heightIn,
		age,
	});
	const tdee = calcTdee({ bmr, activityLevel: opts.activityLevel });
	const targetCalories = calcTargetCalories({
		tdee,
		weightGoalLbsPerWeek: opts.weightGoalLbsPerWeek,
	});
	const macros = calcDefaultMacros({
		weightLbs: opts.weightLbs,
		targetCalories,
	});
	return { age, bmr, tdee, targetCalories, ...macros };
}
