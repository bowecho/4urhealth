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
}: {
	label: string;
	value: number;
	target: number;
	unit: string;
}) {
	const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
	const remaining = Math.max(0, target - value);
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
			<div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
				<div
					className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all"
					style={{ width: `${pct}%` }}
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
		<section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-3">
			<div className="flex items-baseline justify-between">
				<div>
					<p className="text-xs uppercase tracking-wide text-zinc-500">
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
				/>
				<Bar label="Fat" value={totals.fatG} target={targets.fatG} unit="g" />
				<Bar
					label="Carbs"
					value={totals.carbsG}
					target={targets.carbsG}
					unit="g"
				/>
			</div>
		</section>
	);
}
