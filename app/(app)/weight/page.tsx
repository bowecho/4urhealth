import { and, asc, eq, gte } from "drizzle-orm";
import { WeightView } from "@/components/weight-view";
import { db } from "@/db";
import { weightLog } from "@/db/schema";
import { requireAppPageContext } from "@/lib/app-page";
import { addDays } from "@/lib/date";

export default async function WeightPage() {
	const { today, userId } = await requireAppPageContext();
	const start = addDays(today, -365);

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
