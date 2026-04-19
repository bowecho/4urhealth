"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
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
import { THEME_COOKIE_NAME, type ThemePreference } from "@/lib/theme";

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
	themePreference: z.enum(["light", "dark"]),
});

async function persistThemePreferenceCookie(themePreference: ThemePreference) {
	const cookieStore = await cookies();
	cookieStore.set(THEME_COOKIE_NAME, themePreference, {
		path: "/",
		sameSite: "lax",
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		maxAge: 60 * 60 * 24 * 365,
	});
}

export async function saveProfileAction(input: z.input<typeof ProfileSchema>) {
	const userId = await requireUserId();
	const parsed = ProfileSchema.parse(input);
	await persistThemePreferenceCookie(parsed.themePreference);
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
			themePreference: parsed.themePreference,
			updatedAt: new Date(),
		})
		.where(eq(user.id, userId));
	revalidatePath("/settings");
	revalidatePath("/");
}

const FoodImport = z.object({
	id: z.uuid().optional(),
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
				foodId: z.uuid().optional(),
				foodName: z.string(),
				foodBrand: z.string().nullable().optional(),
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
				foodId: z.uuid().nullable().optional(),
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
	const importedFoodIdMap = new Map<string, string>();
	const existingFoodMap = new Map<string, string>();

	function foodLookupKey(food: {
		name?: string;
		brand?: string | null;
		foodName?: string;
		foodBrand?: string | null;
	}) {
		const name = food.name ?? food.foodName ?? "";
		const brand = food.brand ?? food.foodBrand ?? "";
		return `${name.toLowerCase()}::${brand.toLowerCase()}`;
	}

	function resolveFoodId(item: {
		foodId?: string | null;
		foodName: string;
		foodBrand?: string | null;
	}) {
		if (item.foodId) {
			const importedId = importedFoodIdMap.get(item.foodId);
			if (importedId) return importedId;
		}
		return existingFoodMap.get(foodLookupKey(item)) ?? null;
	}

	if (data.foods?.length) {
		const insertedFoods = await db
			.insert(foodItem)
			.values(
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
			)
			.returning({
				id: foodItem.id,
				name: foodItem.name,
				brand: foodItem.brand,
			});
		for (const [index, inserted] of insertedFoods.entries()) {
			const source = data.foods[index];
			if (source?.id) importedFoodIdMap.set(source.id, inserted.id);
			existingFoodMap.set(foodLookupKey(inserted), inserted.id);
		}
		summary.foods = data.foods.length;
	}

	const myFoods = await db
		.select({ id: foodItem.id, name: foodItem.name, brand: foodItem.brand })
		.from(foodItem)
		.where(eq(foodItem.userId, userId));
	for (const food of myFoods) {
		existingFoodMap.set(foodLookupKey(food), food.id);
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
		for (const m of data.savedMeals) {
			const resolved = m.items.flatMap((it) => {
				const id = resolveFoodId(it);
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
				await tx.delete(mealLogItem).where(eq(mealLogItem.mealLogId, row.id));
				await tx.insert(mealLogItem).values(
					log.items.map((it, idx) => ({
						mealLogId: row.id,
						foodItemId: resolveFoodId(it),
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
