"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { type FoodInput, FoodSchema } from "@/app/(app)/foods/schema";
import { db } from "@/db";
import { foodItem } from "@/db/schema";
import { requireUserId } from "@/lib/auth-server";

export async function createFoodAction(input: FoodInput) {
	const userId = await requireUserId();
	const parsed = FoodSchema.parse(input);
	const [created] = await db
		.insert(foodItem)
		.values({
			userId,
			name: parsed.name,
			brand: parsed.brand,
			servingSize: parsed.servingSize.toString(),
			servingUnit: parsed.servingUnit,
			calories: parsed.calories,
			proteinG: parsed.proteinG.toString(),
			fatG: parsed.fatG.toString(),
			carbsG: parsed.carbsG.toString(),
		})
		.returning({
			id: foodItem.id,
			name: foodItem.name,
			brand: foodItem.brand,
			servingSize: foodItem.servingSize,
			servingUnit: foodItem.servingUnit,
			calories: foodItem.calories,
			proteinG: foodItem.proteinG,
			fatG: foodItem.fatG,
			carbsG: foodItem.carbsG,
		});
	if (!created) throw new Error("Failed to create food");
	revalidatePath("/foods");
	return created;
}

export async function updateFoodAction(id: string, input: FoodInput) {
	const userId = await requireUserId();
	const parsed = FoodSchema.parse(input);
	await db
		.update(foodItem)
		.set({
			name: parsed.name,
			brand: parsed.brand,
			servingSize: parsed.servingSize.toString(),
			servingUnit: parsed.servingUnit,
			calories: parsed.calories,
			proteinG: parsed.proteinG.toString(),
			fatG: parsed.fatG.toString(),
			carbsG: parsed.carbsG.toString(),
			updatedAt: new Date(),
		})
		.where(and(eq(foodItem.id, id), eq(foodItem.userId, userId)));
	revalidatePath("/foods");
}

export async function archiveFoodAction(id: string) {
	const userId = await requireUserId();
	const now = new Date();
	await db
		.update(foodItem)
		.set({ archivedAt: now, updatedAt: now })
		.where(and(eq(foodItem.id, id), eq(foodItem.userId, userId)));
	revalidatePath("/foods");
}

export async function unarchiveFoodAction(id: string) {
	const userId = await requireUserId();
	await db
		.update(foodItem)
		.set({ archivedAt: null, updatedAt: new Date() })
		.where(and(eq(foodItem.id, id), eq(foodItem.userId, userId)));
	revalidatePath("/foods");
}
