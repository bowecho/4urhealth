import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mealLog } from "@/db/schema";
import { MEAL_TYPES, type MealType } from "@/lib/app-types";

type MealLogTx = Parameters<
	Parameters<typeof import("@/db")["db"]["transaction"]>[0]
>[0];

type MealItemSnapshotSource = {
	name: string;
	calories: number;
	proteinG: number | string;
	fatG: number | string;
	carbsG: number | string;
};

export const MealTypeSchema = z.enum(MEAL_TYPES);

export function buildMealItemSnapshot(
	source: MealItemSnapshotSource,
	servings: number,
) {
	return {
		servings: servings.toString(),
		nameSnapshot: source.name,
		caloriesSnapshot: Math.round(source.calories * servings),
		proteinGSnapshot: (Number(source.proteinG) * servings).toFixed(1),
		fatGSnapshot: (Number(source.fatG) * servings).toFixed(1),
		carbsGSnapshot: (Number(source.carbsG) * servings).toFixed(1),
	};
}

export async function ensureMealLogId(
	tx: MealLogTx,
	{
		userId,
		date,
		mealType,
	}: {
		userId: string;
		date: string;
		mealType: MealType;
	},
) {
	const [log] = await tx
		.insert(mealLog)
		.values({ userId, date, mealType })
		.onConflictDoUpdate({
			target: [mealLog.userId, mealLog.date, mealLog.mealType],
			set: { updatedAt: new Date() },
		})
		.returning({ id: mealLog.id });

	return log.id;
}

export function revalidateDay(date: string) {
	revalidatePath("/");
	revalidatePath(`/day/${date}`);
}
