import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { MealsView, type SavedMealDetail } from "@/components/meals-view";
import { db } from "@/db";
import { foodItem, savedMeal, savedMealItem } from "@/db/schema";
import { requireSession } from "@/lib/auth-server";
import { todayInTz } from "@/lib/date";

export default async function MealsPage() {
	const session = await requireSession();
	const userId = session.user.id;
	const tz = session.user.timezone || "UTC";
	const today = todayInTz(tz);

	const meals = await db
		.select({ id: savedMeal.id, name: savedMeal.name })
		.from(savedMeal)
		.where(and(eq(savedMeal.userId, userId), isNull(savedMeal.archivedAt)))
		.orderBy(asc(savedMeal.name));

	const itemRows =
		meals.length === 0
			? []
			: await db
					.select({
						savedMealId: savedMealItem.savedMealId,
						servings: savedMealItem.servings,
						sortOrder: savedMealItem.sortOrder,
						foodId: foodItem.id,
						foodName: foodItem.name,
						calories: foodItem.calories,
						proteinG: foodItem.proteinG,
						fatG: foodItem.fatG,
						carbsG: foodItem.carbsG,
					})
					.from(savedMealItem)
					.innerJoin(foodItem, eq(foodItem.id, savedMealItem.foodItemId))
					.where(
						and(
							eq(foodItem.userId, userId),
							inArray(
								savedMealItem.savedMealId,
								meals.map((meal) => meal.id),
							),
						),
					)
					.orderBy(asc(savedMealItem.sortOrder));

	const byMeal = new Map<string, SavedMealDetail["items"]>();
	for (const row of itemRows) {
		const list = byMeal.get(row.savedMealId) ?? [];
		list.push({
			foodId: row.foodId,
			foodName: row.foodName,
			servings: Number(row.servings),
			calories: row.calories,
			proteinG: Number(row.proteinG),
			fatG: Number(row.fatG),
			carbsG: Number(row.carbsG),
		});
		byMeal.set(row.savedMealId, list);
	}

	const savedMeals: SavedMealDetail[] = meals.map((m) => {
		const list = byMeal.get(m.id) ?? [];
		const totals = list.reduce(
			(acc, it) => {
				acc.calories += it.calories * it.servings;
				acc.proteinG += it.proteinG * it.servings;
				acc.fatG += it.fatG * it.servings;
				acc.carbsG += it.carbsG * it.servings;
				return acc;
			},
			{ calories: 0, proteinG: 0, fatG: 0, carbsG: 0 },
		);
		return {
			id: m.id,
			name: m.name,
			items: list,
			totals: {
				calories: Math.round(totals.calories),
				proteinG: Number(totals.proteinG.toFixed(1)),
				fatG: Number(totals.fatG.toFixed(1)),
				carbsG: Number(totals.carbsG.toFixed(1)),
			},
		};
	});

	const foods = await db
		.select()
		.from(foodItem)
		.where(and(eq(foodItem.userId, userId), isNull(foodItem.archivedAt)))
		.orderBy(asc(foodItem.name));
	const foodOptions = foods.map((f) => ({
		id: f.id,
		name: f.name,
		brand: f.brand,
		servingSize: Number(f.servingSize),
		servingUnit: f.servingUnit,
		calories: f.calories,
		proteinG: Number(f.proteinG),
		fatG: Number(f.fatG),
		carbsG: Number(f.carbsG),
	}));

	return (
		<main className="flex-1 p-4 sm:p-6 max-w-3xl mx-auto w-full">
			<MealsView meals={savedMeals} foods={foodOptions} today={today} />
		</main>
	);
}
