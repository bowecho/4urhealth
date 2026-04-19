"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { weightLog } from "@/db/schema";
import { requireUserId } from "@/lib/auth-server";
import { isIsoDate } from "@/lib/date";

const SaveSchema = z.object({
	date: z.string().refine(isIsoDate, "Invalid date"),
	weightLbs: z.number().min(60).max(700),
	note: z.string().trim().max(280).optional(),
});

export async function saveWeightAction(input: z.input<typeof SaveSchema>) {
	const userId = await requireUserId();
	const parsed = SaveSchema.parse(input);
	const now = new Date();
	await db
		.insert(weightLog)
		.values({
			userId,
			date: parsed.date,
			weightLbs: parsed.weightLbs.toString(),
			note: parsed.note ?? null,
		})
		.onConflictDoUpdate({
			target: [weightLog.userId, weightLog.date],
			set: {
				weightLbs: parsed.weightLbs.toString(),
				note: parsed.note ?? null,
				updatedAt: now,
			},
		});
	revalidatePath("/weight");
}

const DeleteSchema = z.object({ date: z.string().refine(isIsoDate) });

export async function deleteWeightAction(input: z.input<typeof DeleteSchema>) {
	const userId = await requireUserId();
	const parsed = DeleteSchema.parse(input);
	await db
		.delete(weightLog)
		.where(and(eq(weightLog.userId, userId), eq(weightLog.date, parsed.date)));
	revalidatePath("/weight");
}
