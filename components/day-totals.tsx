type Totals = {
	calories: number;
	proteinG: number;
	fatG: number;
	carbsG: number;
};

function Bar({
	label,
	value,
	target,
	unit,
	tone,
}: {
	label: string;
	value: number;
	target: number;
	unit: string;
	tone: "sage" | "amber" | "moss";
}) {
	const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
	const remaining = Math.max(0, target - value);
	const fillColor =
		tone === "amber"
			? "var(--accent-amber)"
			: tone === "moss"
				? "#94a89c"
				: "var(--accent-strong)";
	return (
		<div>
			<div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400 mb-1">
				<span>{label}</span>
				<span>
					{Math.round(value)} / {target}
					{unit} · {Math.round(remaining)}
					{unit} left
				</span>
			</div>
			<div className="h-2 rounded-full bg-zinc-200/80 dark:bg-zinc-800 overflow-hidden">
				<div
					className="h-full transition-all"
					style={{ width: `${pct}%`, backgroundColor: fillColor }}
				/>
			</div>
		</div>
	);
}

export function DayTotals({
	totals,
	targets,
}: {
	totals: Totals;
	targets: Totals;
}) {
	const calRemaining = targets.calories - Math.round(totals.calories);
	return (
		<section className="theme-surface rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-3">
			<div className="flex items-baseline justify-between">
				<div>
					<p className="theme-kicker text-xs uppercase tracking-[0.18em]">
						Calories left
					</p>
					<p className="text-3xl font-semibold tabular-nums">
						{calRemaining.toLocaleString()}
					</p>
				</div>
				<p className="text-sm text-zinc-500 tabular-nums">
					{Math.round(totals.calories)} / {targets.calories}
				</p>
			</div>
			<div className="space-y-2">
				<Bar
					label="Protein"
					value={totals.proteinG}
					target={targets.proteinG}
					unit="g"
					tone="sage"
				/>
				<Bar
					label="Fat"
					value={totals.fatG}
					target={targets.fatG}
					unit="g"
					tone="amber"
				/>
				<Bar
					label="Carbs"
					value={totals.carbsG}
					target={targets.carbsG}
					unit="g"
					tone="moss"
				/>
			</div>
		</section>
	);
}
