"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import {
	foodItem,
	mealLog,
	mealLogItem,
	savedMeal,
	savedMealItem,
	user,
	weightLog,
} from "@/db/schema";
import { requireUserId } from "@/lib/auth-server";
import { isIsoDate } from "@/lib/date";

const ProfileSchema = z.object({
	name: z.string().trim().min(1).max(100),
	sex: z.enum(["male", "female"]),
	dateOfBirth: z.iso.date(),
	heightIn: z.number().min(36).max(96),
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
	timezone: z.string().min(1),
});

export async function saveProfileAction(input: z.input<typeof ProfileSchema>) {
	const userId = await requireUserId();
	const parsed = ProfileSchema.parse(input);
	await db
		.update(user)
		.set({
			name: parsed.name,
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
			updatedAt: new Date(),
		})
		.where(eq(user.id, userId));
	revalidatePath("/settings");
	revalidatePath("/");
}

const FoodImport = z.object({
	name: z.string().trim().min(1).max(200),
	brand: z.string().nullable().optional(),
	servingSize: z.number().positive(),
	servingUnit: z.string().min(1).max(40),
	calories: z.number().int().min(0).max(10000),
	proteinG: z.number().min(0).max(500),
	fatG: z.number().min(0).max(500),
	carbsG: z.number().min(0).max(500),
});

const WeightImport = z.object({
	date: z.string().refine(isIsoDate),
	weightLbs: z.number().min(30).max(800),
	note: z.string().nullable().optional(),
});

const SavedMealImport = z.object({
	name: z.string().trim().min(1).max(120),
	items: z
		.array(
			z.object({
				foodName: z.string(),
				servings: z.number().min(0.01).max(100),
			}),
		)
		.min(1)
		.max(50),
});

const MealLogImport = z.object({
	date: z.string().refine(isIsoDate),
	mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
	items: z
		.array(
			z.object({
				foodName: z.string(),
				servings: z.number().min(0.01).max(100),
				calories: z.number().int().min(0),
				proteinG: z.number().min(0),
				fatG: z.number().min(0),
				carbsG: z.number().min(0),
			}),
		)
		.min(1),
});

const ImportSchema = z.object({
	foods: z.array(FoodImport).optional(),
	weights: z.array(WeightImport).optional(),
	savedMeals: z.array(SavedMealImport).optional(),
	mealLogs: z.array(MealLogImport).optional(),
});

export type ImportSummary = {
	foods: number;
	weights: number;
	savedMeals: number;
	mealLogs: number;
};

export async function importDataAction(
	rawJson: string,
): Promise<ImportSummary> {
	const userId = await requireUserId();
	let parsedInput: unknown;
	try {
		parsedInput = JSON.parse(rawJson);
	} catch {
		throw new Error("Invalid JSON");
	}
	const data = ImportSchema.parse(parsedInput);
	const summary: ImportSummary = {
		foods: 0,
		weights: 0,
		savedMeals: 0,
		mealLogs: 0,
	};

	if (data.foods?.length) {
		await db.insert(foodItem).values(
			data.foods.map((f) => ({
				userId,
				name: f.name,
				brand: f.brand ?? null,
				servingSize: f.servingSize.toString(),
				servingUnit: f.servingUnit,
				calories: f.calories,
				proteinG: f.proteinG.toString(),
				fatG: f.fatG.toString(),
				carbsG: f.carbsG.toString(),
			})),
		);
		summary.foods = data.foods.length;
	}

	if (data.weights?.length) {
		for (const w of data.weights) {
			await db
				.insert(weightLog)
				.values({
					userId,
					date: w.date,
					weightLbs: w.weightLbs.toString(),
					note: w.note ?? null,
				})
				.onConflictDoUpdate({
					target: [weightLog.userId, weightLog.date],
					set: {
						weightLbs: w.weightLbs.toString(),
						note: w.note ?? null,
						updatedAt: new Date(),
					},
				});
		}
		summary.weights = data.weights.length;
	}

	if (data.savedMeals?.length) {
		const foodByName = new Map<string, string>();
		const myFoods = await db
			.select({ id: foodItem.id, name: foodItem.name })
			.from(foodItem)
			.where(eq(foodItem.userId, userId));
		for (const f of myFoods) foodByName.set(f.name.toLowerCase(), f.id);

		for (const m of data.savedMeals) {
			const resolved = m.items.flatMap((it) => {
				const id = foodByName.get(it.foodName.toLowerCase());
				return id ? [{ foodItemId: id, servings: it.servings }] : [];
			});
			if (resolved.length === 0) continue;
			await db.transaction(async (tx) => {
				const [sm] = await tx
					.insert(savedMeal)
					.values({ userId, name: m.name })
					.returning({ id: savedMeal.id });
				await tx.insert(savedMealItem).values(
					resolved.map((it, idx) => ({
						savedMealId: sm.id,
						foodItemId: it.foodItemId,
						servings: it.servings.toString(),
						sortOrder: idx,
					})),
				);
			});
			summary.savedMeals++;
		}
	}

	if (data.mealLogs?.length) {
		const foodByName = new Map<string, string>();
		const myFoods = await db
			.select({ id: foodItem.id, name: foodItem.name })
			.from(foodItem)
			.where(eq(foodItem.userId, userId));
		for (const f of myFoods) foodByName.set(f.name.toLowerCase(), f.id);

		for (const log of data.mealLogs) {
			await db.transaction(async (tx) => {
				const [row] = await tx
					.insert(mealLog)
					.values({ userId, date: log.date, mealType: log.mealType })
					.onConflictDoUpdate({
						target: [mealLog.userId, mealLog.date, mealLog.mealType],
						set: { updatedAt: new Date() },
					})
					.returning({ id: mealLog.id });
				await tx.insert(mealLogItem).values(
					log.items.map((it, idx) => ({
						mealLogId: row.id,
						foodItemId: foodByName.get(it.foodName.toLowerCase()) ?? null,
						servings: it.servings.toString(),
						sortOrder: idx,
						nameSnapshot: it.foodName,
						caloriesSnapshot: it.calories,
						proteinGSnapshot: it.proteinG.toString(),
						fatGSnapshot: it.fatG.toString(),
						carbsGSnapshot: it.carbsG.toString(),
					})),
				);
			});
			summary.mealLogs++;
		}
	}

	revalidatePath("/");
	revalidatePath("/foods");
	revalidatePath("/meals");
	revalidatePath("/weight");
	revalidatePath("/stats");
	return summary;
}
