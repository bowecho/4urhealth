"use client";
import { useId, useMemo, useState, useTransition } from "react";
import {
	CartesianGrid,
	Line,
	LineChart,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	deleteWeightAction,
	saveWeightAction,
} from "@/app/(app)/weight/actions";
import { SteppableNumberInput } from "@/components/steppable-number-input";
import { addDays } from "@/lib/date";

export type WeightEntry = {
	date: string;
	weightLbs: number;
	note: string | null;
};

type Range = 30 | 90 | 365;

function parseWeightInput(value: string) {
	return value.trim() === "" ? Number.NaN : Number(value);
}

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
	const newWeightId = useId();
	const editWeightId = useId();
	const parsedNewWeight = parseWeightInput(newWeight);

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

	const latest = windowed.at(-1);
	const first = windowed[0];
	const delta =
		latest && first && latest.date !== first.date
			? latest.weightLbs - first.weightLbs
			: null;

	function handleSave() {
		setError(null);
		const parsedWeight = parseWeightInput(newWeight);
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
		const parsedWeight = parseWeightInput(editWeight);
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
			<WeightHeader latest={latest} delta={delta} />

			<WeightLogSection
				today={today}
				newDate={newDate}
				onNewDateChange={setNewDate}
				newWeight={newWeight}
				onNewWeightChange={setNewWeight}
				newWeightId={newWeightId}
				pending={pending}
				error={error}
				canSave={newWeight.trim() !== "" && Number.isFinite(parsedNewWeight)}
				onSave={handleSave}
			/>

			<WeightChartSection
				range={range}
				onRangeChange={setRange}
				showMA={showMA}
				onShowMAChange={setShowMA}
				windowed={windowed}
				chartData={chartData}
			/>

			<WeightEntriesSection
				entries={reversed}
				editing={editing}
				editWeight={editWeight}
				onEditWeightChange={setEditWeight}
				editWeightId={editWeightId}
				pending={pending}
				onStartEdit={(entry) => {
					setEditing(entry.date);
					setEditWeight(entry.weightLbs.toString());
				}}
				onCancelEdit={() => setEditing(null)}
				onSaveEdit={handleEditSave}
				onDelete={handleDelete}
			/>
		</main>
	);
}

function WeightHeader({
	latest,
	delta,
}: {
	latest: WeightEntry | undefined;
	delta: number | null;
}) {
	return (
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
	);
}

function WeightLogSection({
	today,
	newDate,
	onNewDateChange,
	newWeight,
	onNewWeightChange,
	newWeightId,
	pending,
	error,
	canSave,
	onSave,
}: {
	today: string;
	newDate: string;
	onNewDateChange: (value: string) => void;
	newWeight: string;
	onNewWeightChange: (value: string) => void;
	newWeightId: string;
	pending: boolean;
	error: string | null;
	canSave: boolean;
	onSave: () => void;
}) {
	return (
		<section className="theme-surface rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-3">
			<p className="text-sm font-medium">Log weight</p>
			<div className="flex flex-wrap gap-2 items-end">
				<div>
					<label htmlFor="w-date" className="block text-xs text-zinc-500 mb-1">
						Date
					</label>
					<input
						id="w-date"
						type="date"
						max={today}
						value={newDate}
						onChange={(e) => onNewDateChange(e.target.value)}
						className="theme-input rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
					/>
				</div>
				<div>
					<label
						htmlFor={newWeightId}
						className="block text-xs text-zinc-500 mb-1"
					>
						Weight (lb)
					</label>
					<SteppableNumberInput
						id={newWeightId}
						value={newWeight}
						onChange={onNewWeightChange}
						min={60}
						inputClassName="theme-input w-full rounded-md border border-zinc-300 px-3 py-2 pr-10 text-sm dark:border-zinc-700 dark:bg-zinc-900"
						wrapperClassName="w-28"
					/>
				</div>
				<button
					type="button"
					onClick={onSave}
					disabled={pending || !canSave}
					className="theme-primary-button rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
				>
					{pending ? "Saving…" : "Save"}
				</button>
			</div>
			{error ? <p className="text-sm text-red-600">{error}</p> : null}
		</section>
	);
}

function WeightChartSection({
	range,
	onRangeChange,
	showMA,
	onShowMAChange,
	windowed,
	chartData,
}: {
	range: Range;
	onRangeChange: (value: Range) => void;
	showMA: boolean;
	onShowMAChange: (value: boolean) => void;
	windowed: WeightEntry[];
	chartData: Array<WeightEntry & { ma: number | null }>;
}) {
	return (
		<section className="theme-surface rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-3">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex gap-1">
					{[30, 90, 365].map((value) => (
						<button
							key={value}
							type="button"
							onClick={() => onRangeChange(value as Range)}
							className={`text-xs px-2.5 py-1 rounded-md ${
								range === value
									? "theme-active-pill"
									: "theme-secondary-button border border-zinc-300 dark:border-zinc-700"
							}`}
						>
							{value === 365 ? "1y" : `${value}d`}
						</button>
					))}
				</div>
				<label className="text-xs flex items-center gap-2">
					<input
						type="checkbox"
						checked={showMA}
						onChange={(e) => onShowMAChange(e.target.checked)}
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
					<LineChart
						responsive
						data={chartData}
						margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
						style={{ width: "100%", height: "100%" }}
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
								const num = typeof value === "number" ? value : Number(value);
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
				)}
			</div>
		</section>
	);
}

function WeightEntriesSection({
	entries,
	editing,
	editWeight,
	onEditWeightChange,
	editWeightId,
	pending,
	onStartEdit,
	onCancelEdit,
	onSaveEdit,
	onDelete,
}: {
	entries: WeightEntry[];
	editing: string | null;
	editWeight: string;
	onEditWeightChange: (value: string) => void;
	editWeightId: string;
	pending: boolean;
	onStartEdit: (entry: WeightEntry) => void;
	onCancelEdit: () => void;
	onSaveEdit: (date: string) => void;
	onDelete: (date: string) => void;
}) {
	return (
		<section className="theme-surface rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
			<header className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
				<h2 className="font-medium">Entries</h2>
			</header>
			{entries.length === 0 ? (
				<p className="px-4 py-3 text-sm text-zinc-500">No entries yet.</p>
			) : (
				<ul>
					{entries.map((entry) => (
						<li
							key={entry.date}
							className="px-4 py-2 border-b last:border-b-0 border-zinc-100 dark:border-zinc-900 flex items-center gap-3"
						>
							<span className="text-sm text-zinc-500 tabular-nums w-28">
								{entry.date}
							</span>
							{editing === entry.date ? (
								<>
									<SteppableNumberInput
										id={editWeightId}
										ariaLabel="weight"
										value={editWeight}
										onChange={onEditWeightChange}
										min={60}
										inputClassName="w-full rounded-md border border-zinc-300 px-2 py-1 pr-10 text-sm dark:border-zinc-700 dark:bg-zinc-900"
										wrapperClassName="w-28"
									/>
									<button
										type="button"
										onClick={() => onSaveEdit(entry.date)}
										disabled={pending}
										className="text-xs px-2 py-1 rounded bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 disabled:opacity-50"
									>
										Save
									</button>
									<button
										type="button"
										onClick={onCancelEdit}
										className="text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
									>
										Cancel
									</button>
								</>
							) : (
								<>
									<span className="flex-1 tabular-nums text-sm">
										{entry.weightLbs} lb
									</span>
									<button
										type="button"
										onClick={() => onStartEdit(entry)}
										className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
									>
										Edit
									</button>
									<button
										type="button"
										onClick={() => onDelete(entry.date)}
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
	);
}
