"use server";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { foodItem, mealLogItem, savedMeal, savedMealItem } from "@/db/schema";
import { requireUserId } from "@/lib/auth-server";
import { isIsoDate } from "@/lib/date";
import {
	buildMealItemSnapshot,
	ensureMealLogId,
	MealTypeSchema,
	revalidateDay,
} from "@/lib/meal-log";

const ItemSchema = z.object({
	foodItemId: z.uuid(),
	servings: z.number().min(0.01).max(100),
});

const SaveMealSchema = z.object({
	name: z.string().trim().min(1).max(120),
	items: z.array(ItemSchema).min(1).max(50),
});

async function assertUserOwnsFoods(userId: string, foodIds: string[]) {
	const found = await db
		.select({ id: foodItem.id })
		.from(foodItem)
		.where(and(eq(foodItem.userId, userId), inArray(foodItem.id, foodIds)));
	if (found.length !== new Set(foodIds).size) {
		throw new Error("One or more foods not found");
	}
}

export async function createSavedMealAction(
	input: z.input<typeof SaveMealSchema>,
) {
	const userId = await requireUserId();
	const parsed = SaveMealSchema.parse(input);
	await assertUserOwnsFoods(
		userId,
		parsed.items.map((i) => i.foodItemId),
	);
	await db.transaction(async (tx) => {
		const [sm] = await tx
			.insert(savedMeal)
			.values({ userId, name: parsed.name })
			.returning({ id: savedMeal.id });
		await tx.insert(savedMealItem).values(
			parsed.items.map((it, idx) => ({
				savedMealId: sm.id,
				foodItemId: it.foodItemId,
				servings: it.servings.toString(),
				sortOrder: idx,
			})),
		);
	});
	revalidatePath("/meals");
}

export async function updateSavedMealAction(
	id: string,
	input: z.input<typeof SaveMealSchema>,
) {
	const userId = await requireUserId();
	const parsed = SaveMealSchema.parse(input);
	await assertUserOwnsFoods(
		userId,
		parsed.items.map((i) => i.foodItemId),
	);

	const [sm] = await db
		.select({ id: savedMeal.id })
		.from(savedMeal)
		.where(and(eq(savedMeal.id, id), eq(savedMeal.userId, userId)))
		.limit(1);
	if (!sm) throw new Error("Not found");

	await db.transaction(async (tx) => {
		await tx
			.update(savedMeal)
			.set({ name: parsed.name, updatedAt: new Date() })
			.where(eq(savedMeal.id, id));
		await tx.delete(savedMealItem).where(eq(savedMealItem.savedMealId, id));
		await tx.insert(savedMealItem).values(
			parsed.items.map((it, idx) => ({
				savedMealId: id,
				foodItemId: it.foodItemId,
				servings: it.servings.toString(),
				sortOrder: idx,
			})),
		);
	});
	revalidatePath("/meals");
}

export async function archiveSavedMealAction(id: string) {
	const userId = await requireUserId();
	const now = new Date();
	await db
		.update(savedMeal)
		.set({ archivedAt: now, updatedAt: now })
		.where(and(eq(savedMeal.id, id), eq(savedMeal.userId, userId)));
	revalidatePath("/meals");
}

const ApplySchema = z.object({
	savedMealId: z.uuid(),
	date: z.string().refine(isIsoDate, "Invalid date"),
	mealType: MealTypeSchema,
});

export async function applySavedMealAction(input: z.input<typeof ApplySchema>) {
	const userId = await requireUserId();
	const parsed = ApplySchema.parse(input);

	const [sm] = await db
		.select({ id: savedMeal.id })
		.from(savedMeal)
		.where(
			and(
				eq(savedMeal.id, parsed.savedMealId),
				eq(savedMeal.userId, userId),
				isNull(savedMeal.archivedAt),
			),
		)
		.limit(1);
	if (!sm) throw new Error("Not found");

	const rows = await db
		.select({
			servings: savedMealItem.servings,
			sortOrder: savedMealItem.sortOrder,
			food: foodItem,
		})
		.from(savedMealItem)
		.innerJoin(foodItem, eq(foodItem.id, savedMealItem.foodItemId))
		.where(
			and(eq(savedMealItem.savedMealId, sm.id), eq(foodItem.userId, userId)),
		)
		.orderBy(asc(savedMealItem.sortOrder));

	if (rows.length === 0) throw new Error("Saved meal has no items");

	await db.transaction(async (tx) => {
		const mealLogId = await ensureMealLogId(tx, {
			userId,
			date: parsed.date,
			mealType: parsed.mealType,
		});

		await tx.insert(mealLogItem).values(
			rows.map((r) => {
				const servings = Number(r.servings);
				return {
					mealLogId,
					foodItemId: r.food.id,
					sortOrder: r.sortOrder,
					...buildMealItemSnapshot(r.food, servings),
				};
			}),
		);
	});

	revalidateDay(parsed.date);
}
