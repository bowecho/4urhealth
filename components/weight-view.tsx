"use client";
import { useMemo, useState, useTransition } from "react";
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	deleteWeightAction,
	saveWeightAction,
} from "@/app/(app)/weight/actions";
import { addDays } from "@/lib/date";

export type WeightEntry = {
	date: string;
	weightLbs: number;
	note: string | null;
};

type Range = 30 | 90 | 365;

export function WeightView({
	entries,
	today,
}: {
	entries: WeightEntry[];
	today: string;
}) {
	const [range, setRange] = useState<Range>(90);
	const [showMA, setShowMA] = useState(true);
	const [editing, setEditing] = useState<string | null>(null);
	const [editWeight, setEditWeight] = useState("0");
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);

	const todaysEntry = entries.find((e) => e.date === today);
	const [newDate, setNewDate] = useState(today);
	const [newWeight, setNewWeight] = useState(
		todaysEntry?.weightLbs?.toString() ?? "",
	);

	const windowStart = addDays(today, -range);
	const windowed = useMemo(
		() => entries.filter((e) => e.date >= windowStart),
		[entries, windowStart],
	);

	const chartData = useMemo(() => {
		if (!showMA)
			return windowed.map((e) => ({ ...e, ma: null as number | null }));
		const byDate = new Map(windowed.map((e) => [e.date, e.weightLbs]));
		const dates = windowed.map((e) => e.date);
		return windowed.map((e, i) => {
			const start = Math.max(0, i - 6);
			const slice = dates.slice(start, i + 1);
			const vals = slice
				.map((d) => byDate.get(d))
				.filter((v): v is number => v !== undefined);
			const ma =
				vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
			return { ...e, ma };
		});
	}, [windowed, showMA]);

	const latest = entries.at(-1);
	const first = entries[0];
	const delta =
		latest && first && latest.date !== first.date
			? latest.weightLbs - first.weightLbs
			: null;

	function handleSave() {
		setError(null);
		const parsedWeight =
			newWeight.trim() === "" ? Number.NaN : Number(newWeight);
		if (!Number.isFinite(parsedWeight)) {
			setError("Weight is required");
			return;
		}
		startTransition(async () => {
			try {
				await saveWeightAction({ date: newDate, weightLbs: parsedWeight });
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to save");
			}
		});
	}

	function handleEditSave(date: string) {
		const parsedWeight =
			editWeight.trim() === "" ? Number.NaN : Number(editWeight);
		if (!Number.isFinite(parsedWeight)) {
			setError("Weight is required");
			return;
		}
		startTransition(async () => {
			try {
				await saveWeightAction({ date, weightLbs: parsedWeight });
				setEditing(null);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to save");
			}
		});
	}

	function handleDelete(date: string) {
		startTransition(async () => {
			await deleteWeightAction({ date });
		});
	}

	const reversed = useMemo(() => [...entries].reverse(), [entries]);

	return (
		<main className="flex-1 p-4 sm:p-6 max-w-3xl mx-auto w-full space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Weight</h1>
				{latest ? (
					<div className="text-right">
						<p className="text-sm text-zinc-500">Latest</p>
						<p className="text-lg font-semibold tabular-nums">
							{latest.weightLbs} lb
						</p>
						{delta !== null ? (
							<p
								className={`text-xs ${delta < 0 ? "text-emerald-600" : "text-zinc-500"}`}
							>
								{delta > 0 ? "+" : ""}
								{delta.toFixed(1)} lb over range
							</p>
						) : null}
					</div>
				) : null}
			</div>

			<section className="theme-surface rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-3">
				<p className="text-sm font-medium">Log weight</p>
				<div className="flex flex-wrap gap-2 items-end">
					<div>
						<label
							htmlFor="w-date"
							className="block text-xs text-zinc-500 mb-1"
						>
							Date
						</label>
						<input
							id="w-date"
							type="date"
							max={today}
							value={newDate}
							onChange={(e) => setNewDate(e.target.value)}
							className="theme-input rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
						/>
					</div>
					<div>
						<label htmlFor="w-val" className="block text-xs text-zinc-500 mb-1">
							Weight (lb)
						</label>
						<input
							id="w-val"
							type="number"
							min={60}
							max={700}
							step={0.1}
							value={newWeight}
							onChange={(e) => setNewWeight(e.target.value)}
							className="theme-input w-28 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
						/>
					</div>
					<button
						type="button"
						onClick={handleSave}
						disabled={
							pending ||
							newWeight.trim() === "" ||
							!Number.isFinite(Number(newWeight))
						}
						className="theme-primary-button rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
					>
						{pending ? "Saving…" : "Save"}
					</button>
				</div>
				{error ? <p className="text-sm text-red-600">{error}</p> : null}
			</section>

			<section className="theme-surface rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-3">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div className="flex gap-1">
						{[30, 90, 365].map((r) => (
							<button
								key={r}
								type="button"
								onClick={() => setRange(r as Range)}
								className={`text-xs px-2.5 py-1 rounded-md ${
									range === r
										? "theme-active-pill"
										: "theme-secondary-button border border-zinc-300 dark:border-zinc-700"
								}`}
							>
								{r === 365 ? "1y" : `${r}d`}
							</button>
						))}
					</div>
					<label className="text-xs flex items-center gap-2">
						<input
							type="checkbox"
							checked={showMA}
							onChange={(e) => setShowMA(e.target.checked)}
						/>
						7-day avg
					</label>
				</div>
				<div className="h-64">
					{windowed.length === 0 ? (
						<div className="h-full flex items-center justify-center text-sm text-zinc-500">
							No entries in this range.
						</div>
					) : (
						<ResponsiveContainer width="100%" height="100%">
							<LineChart
								data={chartData}
								margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
							>
								<CartesianGrid
									strokeDasharray="3 3"
									className="stroke-zinc-200 dark:stroke-zinc-800"
								/>
								<XAxis
									dataKey="date"
									tickFormatter={(d: string) => d.slice(5)}
									tick={{ fontSize: 11 }}
									minTickGap={24}
								/>
								<YAxis
									domain={["auto", "auto"]}
									tick={{ fontSize: 11 }}
									width={40}
									allowDecimals={false}
								/>
								<Tooltip
									contentStyle={{ fontSize: 12 }}
									formatter={(value, name) => {
										const num =
											typeof value === "number" ? value : Number(value);
										return [
											Number.isFinite(num) ? `${num.toFixed(1)} lb` : "—",
											name === "ma" ? "7-day avg" : "Weight",
										];
									}}
								/>
								<Line
									type="monotone"
									dataKey="weightLbs"
									stroke="#7c9582"
									strokeWidth={2}
									dot={{ r: 3 }}
									isAnimationActive={false}
								/>
								{showMA ? (
									<Line
										type="monotone"
										dataKey="ma"
										stroke="#c89d67"
										strokeWidth={2}
										strokeDasharray="4 4"
										dot={false}
										isAnimationActive={false}
									/>
								) : null}
							</LineChart>
						</ResponsiveContainer>
					)}
				</div>
			</section>

			<section className="theme-surface rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
				<header className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
					<h2 className="font-medium">Entries</h2>
				</header>
				{reversed.length === 0 ? (
					<p className="px-4 py-3 text-sm text-zinc-500">No entries yet.</p>
				) : (
					<ul>
						{reversed.map((e) => (
							<li
								key={e.date}
								className="px-4 py-2 border-b last:border-b-0 border-zinc-100 dark:border-zinc-900 flex items-center gap-3"
							>
								<span className="text-sm text-zinc-500 tabular-nums w-28">
									{e.date}
								</span>
								{editing === e.date ? (
									<>
										<input
											type="number"
											min={60}
											max={700}
											step={0.1}
											value={editWeight}
											onChange={(ev) => setEditWeight(ev.target.value)}
											className="w-24 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
											aria-label="weight"
										/>
										<button
											type="button"
											onClick={() => handleEditSave(e.date)}
											disabled={pending}
											className="text-xs px-2 py-1 rounded bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 disabled:opacity-50"
										>
											Save
										</button>
										<button
											type="button"
											onClick={() => setEditing(null)}
											className="text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
										>
											Cancel
										</button>
									</>
								) : (
									<>
										<span className="flex-1 tabular-nums text-sm">
											{e.weightLbs} lb
										</span>
										<button
											type="button"
											onClick={() => {
												setEditing(e.date);
												setEditWeight(e.weightLbs.toString());
											}}
											className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
										>
											Edit
										</button>
										<button
											type="button"
											onClick={() => handleDelete(e.date)}
											disabled={pending}
											aria-label="Delete"
											className="text-zinc-400 hover:text-red-600 disabled:opacity-50"
										>
											×
										</button>
									</>
								)}
							</li>
						))}
					</ul>
				)}
			</section>
		</main>
	);
}
