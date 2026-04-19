import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/db/schema";
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

	await db.delete(user).where(eq(user.email, email));
	return NextResponse.json({ ok: true });
}
