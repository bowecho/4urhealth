import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { savedMeal, savedMealItem, user } from "@/db/schema";
import { isPlaywrightHarnessEnabled } from "@/lib/runtime-flags";

type CleanupRequest = {
	email?: string;
};

export async function DELETE(request: Request) {
	if (!isPlaywrightHarnessEnabled()) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const body = (await request
		.json()
		.catch(() => null)) as CleanupRequest | null;
	const email = body?.email?.trim().toLowerCase();
	if (!email?.startsWith("playwright+")) {
		return NextResponse.json({ error: "Invalid email" }, { status: 400 });
	}

	const [match] = await db
		.select({ id: user.id })
		.from(user)
		.where(eq(user.email, email))
		.limit(1);
	if (!match) {
		return NextResponse.json({ ok: true });
	}

	await db.transaction(async (tx) => {
		const meals = await tx
			.select({ id: savedMeal.id })
			.from(savedMeal)
			.where(eq(savedMeal.userId, match.id));
		if (meals.length > 0) {
			await tx.delete(savedMealItem).where(
				inArray(
					savedMealItem.savedMealId,
					meals.map((meal) => meal.id),
				),
			);
		}

		await tx.delete(user).where(eq(user.id, match.id));
	});

	return NextResponse.json({ ok: true });
}
