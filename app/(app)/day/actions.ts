"use server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { FoodSchema } from "@/app/(app)/foods/schema";
import { db } from "@/db";
import { foodItem, mealLog, mealLogItem } from "@/db/schema";
import { requireUserId } from "@/lib/auth-server";
import { isIsoDate } from "@/lib/date";
import {
	buildMealItemSnapshot,
	ensureMealLogId,
	MealTypeSchema,
	revalidateDay,
} from "@/lib/meal-log";

const AddMealItemSchema = z.object({
	date: z.string().refine(isIsoDate, "Invalid date"),
	mealType: MealTypeSchema,
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

	await db.transaction(async (tx) => {
		const mealLogId = await ensureMealLogId(tx, {
			userId,
			date: parsed.date,
			mealType: parsed.mealType,
		});

		await tx.insert(mealLogItem).values({
			mealLogId,
			foodItemId: food.id,
			...buildMealItemSnapshot(food, parsed.servings),
		});
	});

	revalidateDay(parsed.date);
}

const AddOneTimeMealItemSchema = FoodSchema.extend({
	date: z.string().refine(isIsoDate, "Invalid date"),
	mealType: MealTypeSchema,
	servings: z.number().min(0.01).max(100),
});

export async function addOneTimeMealItemAction(
	input: z.input<typeof AddOneTimeMealItemSchema>,
) {
	const userId = await requireUserId();
	const parsed = AddOneTimeMealItemSchema.parse(input);

	await db.transaction(async (tx) => {
		const mealLogId = await ensureMealLogId(tx, {
			userId,
			date: parsed.date,
			mealType: parsed.mealType,
		});

		await tx.insert(mealLogItem).values({
			mealLogId,
			foodItemId: null,
			...buildMealItemSnapshot(parsed, parsed.servings),
		});
	});

	revalidateDay(parsed.date);
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
			servings: mealLogItem.servings,
			caloriesSnapshot: mealLogItem.caloriesSnapshot,
			proteinGSnapshot: mealLogItem.proteinGSnapshot,
			fatGSnapshot: mealLogItem.fatGSnapshot,
			carbsGSnapshot: mealLogItem.carbsGSnapshot,
			logUserId: mealLog.userId,
		})
		.from(mealLogItem)
		.innerJoin(mealLog, eq(mealLog.id, mealLogItem.mealLogId))
		.where(eq(mealLogItem.id, parsed.mealLogItemId))
		.limit(1);
	if (!row || row.logUserId !== userId) throw new Error("Not found");

	const currentServings = Number(row.servings);
	if (!Number.isFinite(currentServings) || currentServings <= 0) {
		throw new Error("Stored meal item is invalid");
	}

	const ratio = parsed.servings / currentServings;

	await db
		.update(mealLogItem)
		.set({
			servings: parsed.servings.toString(),
			caloriesSnapshot: Math.round(row.caloriesSnapshot * ratio),
			proteinGSnapshot: (Number(row.proteinGSnapshot) * ratio).toFixed(1),
			fatGSnapshot: (Number(row.fatGSnapshot) * ratio).toFixed(1),
			carbsGSnapshot: (Number(row.carbsGSnapshot) * ratio).toFixed(1),
		})
		.where(eq(mealLogItem.id, parsed.mealLogItemId));

	revalidateDay(parsed.date);
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

	revalidateDay(parsed.date);
}
