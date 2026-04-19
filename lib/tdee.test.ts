import { describe, expect, it } from "vitest";
import {
	calcAge,
	calcBmr,
	calcDefaultMacros,
	calcPlan,
	calcTargetCalories,
	calcTdee,
} from "./tdee";

describe("calcAge", () => {
	it("handles birthdays not yet passed this year", () => {
		expect(calcAge(new Date("1990-06-15"), new Date("2026-04-19"))).toBe(35);
	});
	it("handles birthdays already passed", () => {
		expect(calcAge(new Date("1990-03-10"), new Date("2026-04-19"))).toBe(36);
	});
	it("handles same-day birthday", () => {
		expect(calcAge(new Date("1990-04-19"), new Date("2026-04-19"))).toBe(36);
	});
});

describe("calcBmr (Mifflin-St Jeor)", () => {
	it("matches a known male example (180 lb, 5'10\", 30y)", () => {
		// 180 lb ≈ 81.65 kg, 70 in ≈ 177.8 cm
		// 10*81.65 + 6.25*177.8 - 5*30 + 5 = 816.5 + 1111.25 - 150 + 5 = 1782.75
		expect(
			calcBmr({ sex: "male", weightLbs: 180, heightIn: 70, age: 30 }),
		).toBe(1783);
	});
	it("matches a known female example (150 lb, 5'5\", 30y)", () => {
		// 150 lb ≈ 68.04 kg, 65 in ≈ 165.1 cm
		// 10*68.04 + 6.25*165.1 - 5*30 - 161 = 680.4 + 1031.875 - 150 - 161 = 1401.275
		expect(
			calcBmr({ sex: "female", weightLbs: 150, heightIn: 65, age: 30 }),
		).toBe(1401);
	});
});

describe("calcTdee", () => {
	it("applies sedentary multiplier", () => {
		expect(calcTdee({ bmr: 1800, activityLevel: "sedentary" })).toBe(2160);
	});
	it("applies very_active multiplier", () => {
		expect(calcTdee({ bmr: 1800, activityLevel: "very_active" })).toBe(3420);
	});
});

describe("calcTargetCalories", () => {
	it("subtracts 500 cal/day for 1 lb/week loss", () => {
		expect(calcTargetCalories({ tdee: 2500, weightGoalLbsPerWeek: -1 })).toBe(
			2000,
		);
	});
	it("subtracts 1000 cal/day for 2 lb/week loss", () => {
		expect(calcTargetCalories({ tdee: 2500, weightGoalLbsPerWeek: -2 })).toBe(
			1500,
		);
	});
	it("floors at 1200", () => {
		expect(calcTargetCalories({ tdee: 1500, weightGoalLbsPerWeek: -2 })).toBe(
			1200,
		);
	});
	it("handles maintenance", () => {
		expect(calcTargetCalories({ tdee: 2200, weightGoalLbsPerWeek: 0 })).toBe(
			2200,
		);
	});
});

describe("calcDefaultMacros", () => {
	it("splits calories with protein/fat anchored by body weight", () => {
		const r = calcDefaultMacros({ weightLbs: 180, targetCalories: 2000 });
		// protein 144g, fat 54g → 576 + 486 = 1062 kcal → remaining 938 ÷ 4 = 234.5 → 235g
		expect(r.proteinG).toBe(144);
		expect(r.fatG).toBe(54);
		expect(r.carbsG).toBe(235);
	});
	it("floors carbs at zero if calories are too low for the fixed macros", () => {
		const r = calcDefaultMacros({ weightLbs: 180, targetCalories: 800 });
		expect(r.carbsG).toBe(0);
	});
});

describe("calcPlan end-to-end", () => {
	it("produces a full plan for a cutting male", () => {
		const plan = calcPlan({
			sex: "male",
			dateOfBirth: new Date("1990-04-19"),
			heightIn: 70,
			weightLbs: 200,
			activityLevel: "light",
			weightGoalLbsPerWeek: -1,
			today: new Date("2026-04-19"),
		});
		expect(plan.age).toBe(36);
		expect(plan.bmr).toBeGreaterThan(1700);
		expect(plan.bmr).toBeLessThan(2000);
		expect(plan.targetCalories).toBe(plan.tdee - 500);
		expect(plan.proteinG).toBe(160);
		expect(plan.fatG).toBe(60);
	});
});
