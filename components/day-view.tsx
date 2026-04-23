import { and, asc, eq, isNull } from "drizzle-orm";
import Link from "next/link";
import { DayTotals } from "@/components/day-totals";
import { MealCard } from "@/components/meal-card";
import { db } from "@/db";
import { foodItem, mealLog, mealLogItem, user } from "@/db/schema";
import { type FoodOption, MEAL_TYPES, type MealItem } from "@/lib/app-types";
import { requireUserId } from "@/lib/auth-server";
import { addDays, formatFriendlyDate } from "@/lib/date";

const MEAL_LABELS: Record<(typeof MEAL_TYPES)[number], string> = {
	breakfast: "Breakfast",
	lunch: "Lunch",
	dinner: "Dinner",
	snack: "Snacks",
};

export async function DayView({
	date,
	today,
}: {
	date: string;
	today: string;
}) {
	const userId = await requireUserId();

	const [profile] = await db
		.select({
			targetCalories: user.targetCalories,
			targetProteinG: user.targetProteinG,
			targetFatG: user.targetFatG,
			targetCarbsG: user.targetCarbsG,
		})
		.from(user)
		.where(eq(user.id, userId))
		.limit(1);

	const rows = await db
		.select({
			itemId: mealLogItem.id,
			foodItemId: mealLogItem.foodItemId,
			servings: mealLogItem.servings,
			name: mealLogItem.nameSnapshot,
			calories: mealLogItem.caloriesSnapshot,
			proteinG: mealLogItem.proteinGSnapshot,
			fatG: mealLogItem.fatGSnapshot,
			carbsG: mealLogItem.carbsGSnapshot,
			sortOrder: mealLogItem.sortOrder,
			createdAt: mealLogItem.createdAt,
			mealType: mealLog.mealType,
		})
		.from(mealLogItem)
		.innerJoin(mealLog, eq(mealLog.id, mealLogItem.mealLogId))
		.where(and(eq(mealLog.userId, userId), eq(mealLog.date, date)))
		.orderBy(asc(mealLogItem.sortOrder), asc(mealLogItem.createdAt));

	const byType: Record<(typeof MEAL_TYPES)[number], MealItem[]> = {
		breakfast: [],
		lunch: [],
		dinner: [],
		snack: [],
	};
	for (const r of rows) {
		byType[r.mealType].push({
			id: r.itemId,
			foodItemId: r.foodItemId,
			servings: Number(r.servings),
			name: r.name,
			calories: r.calories,
			proteinG: Number(r.proteinG),
			fatG: Number(r.fatG),
			carbsG: Number(r.carbsG),
		});
	}

	const foodRows = await db
		.select()
		.from(foodItem)
		.where(and(eq(foodItem.userId, userId), isNull(foodItem.archivedAt)))
		.orderBy(asc(foodItem.name));
	const foods: FoodOption[] = foodRows.map((f) => ({
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

	const totals = rows.reduce(
		(acc, r) => {
			acc.calories += r.calories;
			acc.proteinG += Number(r.proteinG);
			acc.fatG += Number(r.fatG);
			acc.carbsG += Number(r.carbsG);
			return acc;
		},
		{ calories: 0, proteinG: 0, fatG: 0, carbsG: 0 },
	);

	const prev = addDays(date, -1);
	const next = addDays(date, 1);
	const friendly = formatFriendlyDate(date, today);

	return (
		<main className="flex-1 p-4 sm:p-6 max-w-3xl mx-auto w-full space-y-4">
			<div className="flex items-center justify-between">
				<Link
					href={prev === today ? "/" : `/day/${prev}`}
					className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
					aria-label="Previous day"
				>
					← Prev
				</Link>
				<h1 className="text-xl font-semibold">{friendly}</h1>
				<Link
					href={next === today ? "/" : `/day/${next}`}
					className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
					aria-label="Next day"
				>
					Next →
				</Link>
			</div>

			<DayTotals
				totals={totals}
				targets={{
					calories: profile?.targetCalories ?? 0,
					proteinG: profile?.targetProteinG ?? 0,
					fatG: profile?.targetFatG ?? 0,
					carbsG: profile?.targetCarbsG ?? 0,
				}}
			/>

			{MEAL_TYPES.map((mealType) => (
				<MealCard
					key={mealType}
					date={date}
					mealType={mealType}
					label={MEAL_LABELS[mealType]}
					items={byType[mealType]}
					foods={foods}
				/>
			))}
		</main>
	);
}
