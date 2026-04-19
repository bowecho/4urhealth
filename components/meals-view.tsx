"use client";
import { useState, useTransition } from "react";
import {
	applySavedMealAction,
	archiveSavedMealAction,
} from "@/app/(app)/meals/actions";
import type { FoodOption } from "@/components/day-view";
import { SavedMealBuilder } from "@/components/saved-meal-builder";

export type SavedMealItem = {
	foodId: string;
	foodName: string;
	servings: number;
	calories: number;
	proteinG: number;
	fatG: number;
	carbsG: number;
};

export type SavedMealDetail = {
	id: string;
	name: string;
	items: SavedMealItem[];
	totals: { calories: number; proteinG: number; fatG: number; carbsG: number };
};

type BuilderState =
	| { mode: "create" }
	| { mode: "edit"; meal: SavedMealDetail }
	| null;

type ApplyState = { meal: SavedMealDetail } | null;

export function MealsView({
	meals,
	foods,
	today,
}: {
	meals: SavedMealDetail[];
	foods: FoodOption[];
	today: string;
}) {
	const [builder, setBuilder] = useState<BuilderState>(null);
	const [apply, setApply] = useState<ApplyState>(null);
	const [pending, startTransition] = useTransition();

	function handleArchive(id: string) {
		startTransition(async () => {
			await archiveSavedMealAction(id);
		});
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Saved meals</h1>
					<p className="text-sm text-zinc-500">
						Save combinations you reach for often, then log them in a couple of
						taps.
					</p>
				</div>
				<button
					type="button"
					onClick={() => setBuilder({ mode: "create" })}
					className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
				>
					+ New saved meal
				</button>
			</div>

			{meals.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-zinc-300 bg-white/70 px-6 py-10 text-center dark:border-zinc-700 dark:bg-zinc-950/60">
					<p className="text-base font-medium">
						{foods.length === 0
							? "You need foods before meals"
							: "No saved meals yet"}
					</p>
					<p className="mt-2 text-sm text-zinc-500">
						{foods.length === 0
							? "Create a few foods first, then bundle them into reusable meals."
							: "Create one for a breakfast, lunch, or snack you log repeatedly."}
					</p>
				</div>
			) : (
				<ul className="space-y-3">
					{meals.map((m) => (
						<li
							key={m.id}
							className="space-y-2 rounded-xl border border-zinc-200 bg-white/80 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80"
						>
							<div className="flex items-start justify-between gap-3">
								<div className="flex-1 min-w-0">
									<p className="font-medium truncate">{m.name}</p>
									<p className="text-xs text-zinc-500">
										{m.totals.calories} cal · P {m.totals.proteinG}g · F{" "}
										{m.totals.fatG}g · C {m.totals.carbsG}g
									</p>
								</div>
								<div className="flex gap-1 shrink-0">
									<button
										type="button"
										onClick={() => setApply({ meal: m })}
										className="text-xs px-2 py-1 rounded bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
									>
										Log
									</button>
									<button
										type="button"
										onClick={() => setBuilder({ mode: "edit", meal: m })}
										className="text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
									>
										Edit
									</button>
									<button
										type="button"
										onClick={() => handleArchive(m.id)}
										disabled={pending}
										className="text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
									>
										Delete
									</button>
								</div>
							</div>
							{m.items.length > 0 ? (
								<ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-0.5 pl-1">
									{m.items.map((it) => (
										<li key={it.foodId}>
											· {it.foodName} × {it.servings}
										</li>
									))}
								</ul>
							) : null}
						</li>
					))}
				</ul>
			)}

			{builder ? (
				<SavedMealBuilder
					foods={foods}
					initial={builder.mode === "edit" ? builder.meal : null}
					onClose={() => setBuilder(null)}
				/>
			) : null}
			{apply ? (
				<ApplyDialog
					meal={apply.meal}
					today={today}
					onClose={() => setApply(null)}
				/>
			) : null}
		</div>
	);
}

function ApplyDialog({
	meal,
	today,
	onClose,
}: {
	meal: SavedMealDetail;
	today: string;
	onClose: () => void;
}) {
	const [date, setDate] = useState(today);
	const [mealType, setMealType] = useState<
		"breakfast" | "lunch" | "dinner" | "snack"
	>("lunch");
	const [error, setError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	function handleApply() {
		setError(null);
		startTransition(async () => {
			try {
				await applySavedMealAction({ savedMealId: meal.id, date, mealType });
				onClose();
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to apply");
			}
		});
	}

	return (
		<div className="fixed inset-0 z-10 bg-black/40 flex items-center justify-center p-4">
			<div className="w-full max-w-sm rounded-lg bg-white dark:bg-zinc-950 p-5 space-y-4">
				<h2 className="text-lg font-semibold">Log "{meal.name}"</h2>
				<div>
					<label
						htmlFor="apply-date"
						className="block text-xs text-zinc-500 mb-1"
					>
						Date
					</label>
					<input
						id="apply-date"
						type="date"
						value={date}
						onChange={(e) => setDate(e.target.value)}
						className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
					/>
				</div>
				<div>
					<label
						htmlFor="apply-meal"
						className="block text-xs text-zinc-500 mb-1"
					>
						Meal
					</label>
					<select
						id="apply-meal"
						value={mealType}
						onChange={(e) =>
							setMealType(
								e.target.value as "breakfast" | "lunch" | "dinner" | "snack",
							)
						}
						className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
					>
						<option value="breakfast">Breakfast</option>
						<option value="lunch">Lunch</option>
						<option value="dinner">Dinner</option>
						<option value="snack">Snacks</option>
					</select>
				</div>
				{error ? <p className="text-sm text-red-600">{error}</p> : null}
				<div className="flex gap-2 justify-end">
					<button
						type="button"
						onClick={onClose}
						className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleApply}
						disabled={pending}
						className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
					>
						{pending ? "Logging…" : "Log it"}
					</button>
				</div>
			</div>
		</div>
	);
}
