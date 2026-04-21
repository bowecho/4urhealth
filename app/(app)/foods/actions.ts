"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { foodItem } from "@/db/schema";
import { requireUserId } from "@/lib/auth-server";

export const FoodSchema = z.object({
	name: z.string().trim().min(1).max(120),
	brand: z
		.string()
		.trim()
		.max(120)
		.optional()
		.transform((v) => (v ? v : null)),
	servingSize: z.number().min(0.01).max(1000),
	servingUnit: z.string().trim().min(1).max(40),
	calories: z.number().int().min(0).max(10000),
	proteinG: z.number().min(0).max(500),
	fatG: z.number().min(0).max(500),
	carbsG: z.number().min(0).max(1000),
});

export type FoodInput = z.input<typeof FoodSchema>;

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
