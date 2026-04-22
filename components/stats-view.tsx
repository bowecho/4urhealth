"use client";
import Link from "next/link";
import { Cell, Pie, PieChart, Tooltip } from "recharts";

type Daily = {
	date: string;
	calories: number;
	proteinG: number;
	fatG: number;
	carbsG: number;
};

type Targets = {
	calories: number | null;
	proteinG: number | null;
	fatG: number | null;
	carbsG: number | null;
};

export function StatsView({
	range,
	today,
	dailySeries,
	weightSeries,
	targets,
}: {
	range: "week" | "month";
	today: string;
	dailySeries: Daily[];
	weightSeries: { date: string; weightLbs: number }[];
	targets: Targets;
}) {
	const loggedDays = dailySeries.filter((d) => d.calories > 0);
	const loggedCount = loggedDays.length;
	const avg = {
		calories: loggedCount
			? Math.round(loggedDays.reduce((s, d) => s + d.calories, 0) / loggedCount)
			: 0,
		proteinG: loggedCount
			? loggedDays.reduce((s, d) => s + d.proteinG, 0) / loggedCount
			: 0,
		fatG: loggedCount
			? loggedDays.reduce((s, d) => s + d.fatG, 0) / loggedCount
			: 0,
		carbsG: loggedCount
			? loggedDays.reduce((s, d) => s + d.carbsG, 0) / loggedCount
			: 0,
	};

	const hitDays = targets.calories
		? loggedDays.filter((d) => d.calories <= (targets.calories ?? 0)).length
		: 0;
	const hitRate = loggedCount ? Math.round((hitDays / loggedCount) * 100) : 0;

	const streak = computeStreak(dailySeries, today, targets.calories);

	const macroData = [
		{ name: "Protein", value: avg.proteinG * 4, color: "#7c9582" },
		{ name: "Fat", value: avg.fatG * 9, color: "#c89d67" },
		{ name: "Carbs", value: avg.carbsG * 4, color: "#9baea2" },
	];
	const hasMacros = macroData.some((m) => m.value > 0);

	const startWeight = weightSeries[0]?.weightLbs ?? null;
	const endWeight = weightSeries[weightSeries.length - 1]?.weightLbs ?? null;
	const weightDelta =
		startWeight !== null && endWeight !== null ? endWeight - startWeight : null;

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Stats</h1>
				<div className="flex gap-1">
					<RangeLink
						label="Week"
						href="/stats?range=week"
						active={range === "week"}
					/>
					<RangeLink
						label="Month"
						href="/stats?range=month"
						active={range === "month"}
					/>
				</div>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<Stat
					label="Days logged"
					value={`${loggedCount}/${dailySeries.length}`}
				/>
				<Stat
					label="Avg calories"
					value={loggedCount ? avg.calories.toLocaleString() : "—"}
				/>
				<Stat
					label={targets.calories ? `Under ${targets.calories}` : "Adherence"}
					value={targets.calories ? `${hitRate}%` : "—"}
				/>
				<Stat
					label="Current streak"
					value={
						targets.calories ? `${streak} day${streak === 1 ? "" : "s"}` : "—"
					}
				/>
			</div>

			<section className="theme-surface rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
				<h2 className="text-sm font-medium mb-3">Calories per day</h2>
				{dailySeries.every((d) => d.calories === 0) ? (
					<p className="text-sm text-zinc-500 py-4 text-center">
						No meals logged in this range.
					</p>
				) : (
					<ul className="space-y-1">
						{dailySeries.map((d) => (
							<AdherenceRow
								key={d.date}
								date={d.date}
								calories={d.calories}
								target={targets.calories}
							/>
						))}
					</ul>
				)}
			</section>

			<section className="theme-surface rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
				<h2 className="text-sm font-medium mb-3">Average macros</h2>
				{!hasMacros ? (
					<p className="text-sm text-zinc-500 py-4 text-center">
						No macros to show yet.
					</p>
				) : (
					<div className="flex items-center gap-4">
						<div className="w-40 h-40 shrink-0">
							<PieChart responsive style={{ width: "100%", height: "100%" }}>
								<Pie
									data={macroData}
									dataKey="value"
									innerRadius={40}
									outerRadius={70}
									paddingAngle={2}
									stroke="none"
								>
									{macroData.map((entry) => (
										<Cell key={entry.name} fill={entry.color} />
									))}
								</Pie>
								<Tooltip
									formatter={(value) => {
										const n = typeof value === "number" ? value : Number(value);
										return Number.isFinite(n) ? `${Math.round(n)} cal` : "—";
									}}
								/>
							</PieChart>
						</div>
						<ul className="text-sm space-y-1 flex-1">
							<MacroLegend
								color="#0ea5e9"
								label="Protein"
								grams={avg.proteinG}
								target={targets.proteinG}
							/>
							<MacroLegend
								color="#f59e0b"
								label="Fat"
								grams={avg.fatG}
								target={targets.fatG}
							/>
							<MacroLegend
								color="#10b981"
								label="Carbs"
								grams={avg.carbsG}
								target={targets.carbsG}
							/>
						</ul>
					</div>
				)}
			</section>

			<section className="theme-surface rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
				<h2 className="text-sm font-medium mb-2">Weight change</h2>
				{weightDelta === null ? (
					<p className="text-sm text-zinc-500">
						No weight entries in this range.
					</p>
				) : (
					<p className="text-sm">
						{startWeight?.toFixed(1)} → {endWeight?.toFixed(1)} lb{" "}
						<span
							className={
								weightDelta < 0
									? "text-emerald-600"
									: weightDelta > 0
										? "text-red-600"
										: "text-zinc-500"
							}
						>
							({weightDelta > 0 ? "+" : ""}
							{weightDelta.toFixed(1)} lb)
						</span>
					</p>
				)}
			</section>
		</div>
	);
}

function RangeLink({
	label,
	href,
	active,
}: {
	label: string;
	href: string;
	active: boolean;
}) {
	return (
		<Link
			href={href}
			className={`px-3 py-1 text-sm rounded-md ${
				active
					? "theme-active-pill"
					: "theme-secondary-button border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900"
			}`}
		>
			{label}
		</Link>
	);
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div className="theme-stat-card rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3">
			<p className="text-xs text-zinc-500">{label}</p>
			<p className="text-lg font-semibold mt-0.5">{value}</p>
		</div>
	);
}

function AdherenceRow({
	date,
	calories,
	target,
}: {
	date: string;
	calories: number;
	target: number | null;
}) {
	const pct = target ? Math.min(150, (calories / target) * 100) : 0;
	const over = target !== null && calories > target;
	const barColor = over ? "var(--accent-amber)" : "var(--accent-strong)";
	const [, m, d] = date.split("-");
	return (
		<li className="flex items-center gap-3 text-xs">
			<span className="w-10 text-zinc-500 tabular-nums">
				{m}/{d}
			</span>
			<div className="flex-1 h-2 rounded-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
				{target && calories > 0 ? (
					<div
						className="h-full"
						style={{
							width: `${Math.min(100, pct)}%`,
							backgroundColor: barColor,
						}}
					/>
				) : null}
			</div>
			<span className="w-20 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
				{calories > 0 ? `${calories}` : "—"}
				{target ? <span className="text-zinc-400"> / {target}</span> : null}
			</span>
		</li>
	);
}

function MacroLegend({
	color,
	label,
	grams,
	target,
}: {
	color: string;
	label: string;
	grams: number;
	target: number | null;
}) {
	return (
		<li className="flex items-center gap-2">
			<span
				className="w-3 h-3 rounded-sm inline-block"
				style={{ backgroundColor: color }}
			/>
			<span className="flex-1">{label}</span>
			<span className="tabular-nums">
				{grams.toFixed(1)}g
				{target ? <span className="text-zinc-500"> / {target}g</span> : null}
			</span>
		</li>
	);
}

function computeStreak(
	series: Daily[],
	today: string,
	targetCalories: number | null,
): number {
	if (!targetCalories) return 0;
	let streak = 0;
	for (let i = series.length - 1; i >= 0; i--) {
		const d = series[i];
		if (d.date > today) continue;
		if (d.calories === 0) break;
		if (d.calories > targetCalories) break;
		streak++;
	}
	return streak;
}
