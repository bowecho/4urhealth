import { and, asc, eq, gte } from "drizzle-orm";
import { WeightView } from "@/components/weight-view";
import { db } from "@/db";
import { weightLog } from "@/db/schema";
import { requireSession } from "@/lib/auth-server";
import { addDays, todayInTz } from "@/lib/date";

export default async function WeightPage() {
	const session = await requireSession();
	const tz = session.user.timezone || "UTC";
	const today = todayInTz(tz);
	const start = addDays(today, -365);

	const userId = session.user.id;
	const rows = await db
		.select({
			date: weightLog.date,
			weightLbs: weightLog.weightLbs,
			note: weightLog.note,
		})
		.from(weightLog)
		.where(and(eq(weightLog.userId, userId), gte(weightLog.date, start)))
		.orderBy(asc(weightLog.date));

	const entries = rows.map((r) => ({
		date: r.date,
		weightLbs: Number(r.weightLbs),
		note: r.note,
	}));

	return <WeightView entries={entries} today={today} />;
}
