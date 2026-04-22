"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { user, weightLog } from "@/db/schema";
import { requireUserId } from "@/lib/auth-server";
import { isValidTimeZone, todayInTz } from "@/lib/date";

const OnboardingSchema = z.object({
	sex: z.enum(["male", "female"]),
	dateOfBirth: z.iso.date(),
	heightIn: z.number().min(36).max(96),
	weightLbs: z.number().min(60).max(700),
	activityLevel: z.enum([
		"sedentary",
		"light",
		"moderate",
		"active",
		"very_active",
	]),
	weightGoalLbsPerWeek: z.number().min(-2).max(2),
	targetCalories: z.number().int().min(1000).max(6000),
	targetProteinG: z.number().int().min(0).max(500),
	targetFatG: z.number().int().min(0).max(300),
	targetCarbsG: z.number().int().min(0).max(800),
	timezone: z.string().trim().refine(isValidTimeZone, "Invalid timezone"),
});

export type OnboardingInput = z.infer<typeof OnboardingSchema>;

export async function saveOnboardingAction(input: OnboardingInput) {
	const userId = await requireUserId();
	const parsed = OnboardingSchema.parse(input);
	const now = new Date();
	const today = todayInTz(parsed.timezone, now);

	await db.transaction(async (tx) => {
		await tx
			.update(user)
			.set({
				sex: parsed.sex,
				dateOfBirth: parsed.dateOfBirth,
				heightIn: parsed.heightIn.toString(),
				activityLevel: parsed.activityLevel,
				weightGoalLbsPerWeek: parsed.weightGoalLbsPerWeek.toString(),
				targetCalories: parsed.targetCalories,
				targetProteinG: parsed.targetProteinG,
				targetFatG: parsed.targetFatG,
				targetCarbsG: parsed.targetCarbsG,
				timezone: parsed.timezone,
				onboardedAt: now,
				updatedAt: now,
			})
			.where(eq(user.id, userId));

		await tx
			.insert(weightLog)
			.values({
				userId,
				date: today,
				weightLbs: parsed.weightLbs.toString(),
			})
			.onConflictDoUpdate({
				target: [weightLog.userId, weightLog.date],
				set: { weightLbs: parsed.weightLbs.toString(), updatedAt: now },
			});
	});

	revalidatePath("/");
	redirect("/");
}
