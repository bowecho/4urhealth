import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
	foodItem,
	mealLog,
	mealLogItem,
	savedMeal,
	savedMealItem,
	weightLog,
} from "@/db/schema";
import { requireUserId } from "@/lib/auth-server";

export async function GET() {
	const userId = await requireUserId();

	const [foods, weights, smRows, smItemRows, logs, logItemRows] =
		await Promise.all([
			db
				.select({
					id: foodItem.id,
					name: foodItem.name,
					brand: foodItem.brand,
					servingSize: foodItem.servingSize,
					servingUnit: foodItem.servingUnit,
					calories: foodItem.calories,
					proteinG: foodItem.proteinG,
					fatG: foodItem.fatG,
					carbsG: foodItem.carbsG,
					archivedAt: foodItem.archivedAt,
				})
				.from(foodItem)
				.where(eq(foodItem.userId, userId))
				.orderBy(asc(foodItem.name)),
			db
				.select({
					date: weightLog.date,
					weightLbs: weightLog.weightLbs,
					note: weightLog.note,
				})
				.from(weightLog)
				.where(eq(weightLog.userId, userId))
				.orderBy(asc(weightLog.date)),
			db
				.select({ id: savedMeal.id, name: savedMeal.name })
				.from(savedMeal)
				.where(eq(savedMeal.userId, userId))
				.orderBy(asc(savedMeal.name)),
			db
				.select({
					savedMealId: savedMealItem.savedMealId,
					foodId: foodItem.id,
					foodBrand: foodItem.brand,
					servings: savedMealItem.servings,
					sortOrder: savedMealItem.sortOrder,
					foodName: foodItem.name,
				})
				.from(savedMealItem)
				.innerJoin(savedMeal, eq(savedMeal.id, savedMealItem.savedMealId))
				.innerJoin(foodItem, eq(foodItem.id, savedMealItem.foodItemId))
				.where(eq(savedMeal.userId, userId))
				.orderBy(asc(savedMealItem.sortOrder)),
			db
				.select({
					id: mealLog.id,
					date: mealLog.date,
					mealType: mealLog.mealType,
				})
				.from(mealLog)
				.where(eq(mealLog.userId, userId))
				.orderBy(asc(mealLog.date)),
			db
				.select({
					mealLogId: mealLogItem.mealLogId,
					foodId: mealLogItem.foodItemId,
					servings: mealLogItem.servings,
					sortOrder: mealLogItem.sortOrder,
					nameSnapshot: mealLogItem.nameSnapshot,
					caloriesSnapshot: mealLogItem.caloriesSnapshot,
					proteinGSnapshot: mealLogItem.proteinGSnapshot,
					fatGSnapshot: mealLogItem.fatGSnapshot,
					carbsGSnapshot: mealLogItem.carbsGSnapshot,
				})
				.from(mealLogItem)
				.innerJoin(mealLog, eq(mealLog.id, mealLogItem.mealLogId))
				.where(and(eq(mealLog.userId, userId)))
				.orderBy(asc(mealLogItem.sortOrder)),
		]);

	const smItemsByMeal = new Map<
		string,
		{
			foodId: string;
			foodName: string;
			foodBrand: string | null;
			servings: number;
		}[]
	>();
	for (const r of smItemRows) {
		const list = smItemsByMeal.get(r.savedMealId) ?? [];
		list.push({
			foodId: r.foodId,
			foodName: r.foodName,
			foodBrand: r.foodBrand,
			servings: Number(r.servings),
		});
		smItemsByMeal.set(r.savedMealId, list);
	}
	const savedMeals = smRows.map((m) => ({
		name: m.name,
		items: smItemsByMeal.get(m.id) ?? [],
	}));

	const logItemsByLog = new Map<
		string,
		{
			foodName: string;
			foodId: string | null;
			servings: number;
			calories: number;
			proteinG: number;
			fatG: number;
			carbsG: number;
		}[]
	>();
	for (const r of logItemRows) {
		const list = logItemsByLog.get(r.mealLogId) ?? [];
		list.push({
			foodId: r.foodId,
			foodName: r.nameSnapshot,
			servings: Number(r.servings),
			calories: r.caloriesSnapshot,
			proteinG: Number(r.proteinGSnapshot),
			fatG: Number(r.fatGSnapshot),
			carbsG: Number(r.carbsGSnapshot),
		});
		logItemsByLog.set(r.mealLogId, list);
	}
	const mealLogs = logs.map((l) => ({
		date: l.date,
		mealType: l.mealType,
		items: logItemsByLog.get(l.id) ?? [],
	}));

	const payload = {
		exportedAt: new Date().toISOString(),
		foods: foods.map((f) => ({
			id: f.id,
			name: f.name,
			brand: f.brand,
			servingSize: Number(f.servingSize),
			servingUnit: f.servingUnit,
			calories: f.calories,
			proteinG: Number(f.proteinG),
			fatG: Number(f.fatG),
			carbsG: Number(f.carbsG),
			archivedAt: f.archivedAt,
		})),
		weights: weights.map((w) => ({
			date: w.date,
			weightLbs: Number(w.weightLbs),
			note: w.note,
		})),
		savedMeals,
		mealLogs,
	};

	const today = new Date().toISOString().slice(0, 10);
	return new Response(JSON.stringify(payload, null, 2), {
		headers: {
			"Content-Type": "application/json",
			"Content-Disposition": `attachment; filename="4urhealth-${today}.json"`,
		},
	});
}
