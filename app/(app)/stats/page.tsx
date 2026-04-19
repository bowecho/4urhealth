import { and, asc, eq, gte, lte } from "drizzle-orm";
import { StatsView } from "@/components/stats-view";
import { db } from "@/db";
import { mealLog, mealLogItem, user, weightLog } from "@/db/schema";
import { requireSession } from "@/lib/auth-server";
import { addDays, todayInTz } from "@/lib/date";

type SP = { range?: string };

export default async function StatsPage(props: { searchParams: Promise<SP> }) {
	const sp = await props.searchParams;
	const range = sp.range === "month" ? "month" : "week";
	const session = await requireSession();
	const userId = session.user.id;
	const tz = session.user.timezone || "UTC";
	const today = todayInTz(tz);
	const days = range === "month" ? 30 : 7;
	const start = addDays(today, -(days - 1));

	const [profile] = await db
		.select({
			targetCalories: user.targetCalories,
			targetProteinG: user.targetProteinG,
			targetFatG: user.targetFatG,
			targetCarbsG: user.targetCarbsG,
		})
		.from(user)
		.where(eq(user.id, userId))
		.limit(1);

	const logRows = await db
		.select({
			date: mealLog.date,
			calories: mealLogItem.caloriesSnapshot,
			proteinG: mealLogItem.proteinGSnapshot,
			fatG: mealLogItem.fatGSnapshot,
			carbsG: mealLogItem.carbsGSnapshot,
		})
		.from(mealLogItem)
		.innerJoin(mealLog, eq(mealLog.id, mealLogItem.mealLogId))
		.where(
			and(
				eq(mealLog.userId, userId),
				gte(mealLog.date, start),
				lte(mealLog.date, today),
			),
		);

	const perDay = new Map<
		string,
		{ calories: number; proteinG: number; fatG: number; carbsG: number }
	>();
	for (let i = 0; i < days; i++) {
		perDay.set(addDays(start, i), {
			calories: 0,
			proteinG: 0,
			fatG: 0,
			carbsG: 0,
		});
	}
	for (const r of logRows) {
		const acc = perDay.get(r.date);
		if (!acc) continue;
		acc.calories += r.calories;
		acc.proteinG += Number(r.proteinG);
		acc.fatG += Number(r.fatG);
		acc.carbsG += Number(r.carbsG);
	}

	const dailySeries = Array.from(perDay.entries()).map(([date, t]) => ({
		date,
		calories: Math.round(t.calories),
		proteinG: Number(t.proteinG.toFixed(1)),
		fatG: Number(t.fatG.toFixed(1)),
		carbsG: Number(t.carbsG.toFixed(1)),
	}));

	const weights = await db
		.select({ date: weightLog.date, weightLbs: weightLog.weightLbs })
		.from(weightLog)
		.where(
			and(
				eq(weightLog.userId, userId),
				gte(weightLog.date, start),
				lte(weightLog.date, today),
			),
		)
		.orderBy(asc(weightLog.date));

	const weightSeries = weights.map((w) => ({
		date: w.date,
		weightLbs: Number(w.weightLbs),
	}));

	return (
		<main className="flex-1 p-4 sm:p-6 max-w-3xl mx-auto w-full">
			<StatsView
				range={range}
				today={today}
				dailySeries={dailySeries}
				weightSeries={weightSeries}
				targets={{
					calories: profile?.targetCalories ?? null,
					proteinG: profile?.targetProteinG ?? null,
					fatG: profile?.targetFatG ?? null,
					carbsG: profile?.targetCarbsG ?? null,
				}}
			/>
		</main>
	);
}
