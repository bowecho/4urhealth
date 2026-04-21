"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { FoodSchema } from "@/app/(app)/foods/actions";
import { db } from "@/db";
import { foodItem, mealLog, mealLogItem } from "@/db/schema";
import { requireUserId } from "@/lib/auth-server";
import { isIsoDate } from "@/lib/date";

const MealTypeEnum = z.enum(["breakfast", "lunch", "dinner", "snack"]);

const AddMealItemSchema = z.object({
	date: z.string().refine(isIsoDate, "Invalid date"),
	mealType: MealTypeEnum,
	foodItemId: z.uuid(),
	servings: z.number().min(0.01).max(100),
});

export async function addMealItemAction(
	input: z.input<typeof AddMealItemSchema>,
) {
	const userId = await requireUserId();
	const parsed = AddMealItemSchema.parse(input);

	const [food] = await db
		.select()
		.from(foodItem)
		.where(and(eq(foodItem.id, parsed.foodItemId), eq(foodItem.userId, userId)))
		.limit(1);
	if (!food) throw new Error("Food not found");

	const caloriesSnapshot = Math.round(food.calories * parsed.servings);
	const proteinGSnapshot = (Number(food.proteinG) * parsed.servings).toFixed(1);
	const fatGSnapshot = (Number(food.fatG) * parsed.servings).toFixed(1);
	const carbsGSnapshot = (Number(food.carbsG) * parsed.servings).toFixed(1);

	await db.transaction(async (tx) => {
		const [log] = await tx
			.insert(mealLog)
			.values({ userId, date: parsed.date, mealType: parsed.mealType })
			.onConflictDoUpdate({
				target: [mealLog.userId, mealLog.date, mealLog.mealType],
				set: { updatedAt: new Date() },
			})
			.returning({ id: mealLog.id });

		await tx.insert(mealLogItem).values({
			mealLogId: log.id,
			foodItemId: food.id,
			servings: parsed.servings.toString(),
			nameSnapshot: food.name,
			caloriesSnapshot,
			proteinGSnapshot,
			fatGSnapshot,
			carbsGSnapshot,
		});
	});

	revalidatePath("/");
	revalidatePath(`/day/${parsed.date}`);
}

const AddOneTimeMealItemSchema = FoodSchema.extend({
	date: z.string().refine(isIsoDate, "Invalid date"),
	mealType: MealTypeEnum,
	servings: z.number().min(0.01).max(100),
});

export async function addOneTimeMealItemAction(
	input: z.input<typeof AddOneTimeMealItemSchema>,
) {
	const userId = await requireUserId();
	const parsed = AddOneTimeMealItemSchema.parse(input);

	const caloriesSnapshot = Math.round(parsed.calories * parsed.servings);
	const proteinGSnapshot = (parsed.proteinG * parsed.servings).toFixed(1);
	const fatGSnapshot = (parsed.fatG * parsed.servings).toFixed(1);
	const carbsGSnapshot = (parsed.carbsG * parsed.servings).toFixed(1);

	await db.transaction(async (tx) => {
		const [log] = await tx
			.insert(mealLog)
			.values({ userId, date: parsed.date, mealType: parsed.mealType })
			.onConflictDoUpdate({
				target: [mealLog.userId, mealLog.date, mealLog.mealType],
				set: { updatedAt: new Date() },
			})
			.returning({ id: mealLog.id });

		await tx.insert(mealLogItem).values({
			mealLogId: log.id,
			foodItemId: null,
			servings: parsed.servings.toString(),
			nameSnapshot: parsed.name,
			caloriesSnapshot,
			proteinGSnapshot,
			fatGSnapshot,
			carbsGSnapshot,
		});
	});

	revalidatePath("/");
	revalidatePath(`/day/${parsed.date}`);
}

const UpdateServingsSchema = z.object({
	mealLogItemId: z.uuid(),
	servings: z.number().min(0.01).max(100),
	date: z.string().refine(isIsoDate),
});

export async function updateMealItemServingsAction(
	input: z.input<typeof UpdateServingsSchema>,
) {
	const userId = await requireUserId();
	const parsed = UpdateServingsSchema.parse(input);

	const [row] = await db
		.select({
			itemId: mealLogItem.id,
			foodItemId: mealLogItem.foodItemId,
			logUserId: mealLog.userId,
		})
		.from(mealLogItem)
		.innerJoin(mealLog, eq(mealLog.id, mealLogItem.mealLogId))
		.where(eq(mealLogItem.id, parsed.mealLogItemId))
		.limit(1);
	if (!row || row.logUserId !== userId) throw new Error("Not found");

	if (!row.foodItemId) {
		await db
			.update(mealLogItem)
			.set({ servings: parsed.servings.toString() })
			.where(eq(mealLogItem.id, parsed.mealLogItemId));
	} else {
		const [food] = await db
			.select()
			.from(foodItem)
			.where(eq(foodItem.id, row.foodItemId))
			.limit(1);
		if (!food) throw new Error("Source food missing");
		await db
			.update(mealLogItem)
			.set({
				servings: parsed.servings.toString(),
				caloriesSnapshot: Math.round(food.calories * parsed.servings),
				proteinGSnapshot: (Number(food.proteinG) * parsed.servings).toFixed(1),
				fatGSnapshot: (Number(food.fatG) * parsed.servings).toFixed(1),
				carbsGSnapshot: (Number(food.carbsG) * parsed.servings).toFixed(1),
			})
			.where(eq(mealLogItem.id, parsed.mealLogItemId));
	}

	revalidatePath("/");
	revalidatePath(`/day/${parsed.date}`);
}

const DeleteSchema = z.object({
	mealLogItemId: z.uuid(),
	date: z.string().refine(isIsoDate),
});

export async function deleteMealItemAction(
	input: z.input<typeof DeleteSchema>,
) {
	const userId = await requireUserId();
	const parsed = DeleteSchema.parse(input);

	const [row] = await db
		.select({ logUserId: mealLog.userId })
		.from(mealLogItem)
		.innerJoin(mealLog, eq(mealLog.id, mealLogItem.mealLogId))
		.where(eq(mealLogItem.id, parsed.mealLogItemId))
		.limit(1);
	if (!row || row.logUserId !== userId) throw new Error("Not found");

	await db.delete(mealLogItem).where(eq(mealLogItem.id, parsed.mealLogItemId));

	revalidatePath("/");
	revalidatePath(`/day/${parsed.date}`);
}
