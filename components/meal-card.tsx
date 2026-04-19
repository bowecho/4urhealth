"use client";
import { useState, useTransition } from "react";
import {
	deleteMealItemAction,
	updateMealItemServingsAction,
} from "@/app/(app)/day/actions";
import { AddMealItemDialog } from "@/components/add-meal-item-dialog";
import type { FoodOption, MealItem } from "@/components/day-view";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export function MealCard({
	date,
	mealType,
	label,
	items,
	foods,
}: {
	date: string;
	mealType: MealType;
	label: string;
	items: MealItem[];
	foods: FoodOption[];
}) {
	const [addOpen, setAddOpen] = useState(false);
	const [pending, startTransition] = useTransition();
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editingServings, setEditingServings] = useState<number>(1);

	const totalCal = items.reduce((s, i) => s + i.calories, 0);

	function handleDelete(id: string) {
		startTransition(async () => {
			await deleteMealItemAction({ mealLogItemId: id, date });
		});
	}

	function startEdit(item: MealItem) {
		setEditingId(item.id);
		setEditingServings(item.servings);
	}

	function saveEdit() {
		if (!editingId) return;
		const id = editingId;
		const servings = editingServings;
		startTransition(async () => {
			await updateMealItemServingsAction({ mealLogItemId: id, servings, date });
			setEditingId(null);
		});
	}

	return (
		<section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
			<header className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
				<div>
					<h2 className="font-medium">{label}</h2>
					{items.length > 0 ? (
						<p className="text-xs text-zinc-500">{totalCal} cal</p>
					) : null}
				</div>
				<button
					type="button"
					onClick={() => setAddOpen(true)}
					className="text-sm rounded-md border border-zinc-300 px-2.5 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
				>
					+ Add
				</button>
			</header>

			{items.length === 0 ? (
				<p className="px-4 py-3 text-sm text-zinc-500">Nothing logged yet.</p>
			) : (
				<ul>
					{items.map((item) => (
						<li
							key={item.id}
							className="px-4 py-3 border-b last:border-b-0 border-zinc-100 dark:border-zinc-900"
						>
							{editingId === item.id ? (
								<div className="flex items-center gap-2">
									<span className="flex-1 text-sm">{item.name}</span>
									<input
										type="number"
										min={0.01}
										step={0.1}
										value={editingServings}
										onChange={(e) => setEditingServings(Number(e.target.value))}
										className="w-20 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
										aria-label="servings"
									/>
									<button
										type="button"
										onClick={saveEdit}
										disabled={pending}
										className="text-xs px-2 py-1 rounded bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 disabled:opacity-50"
									>
										Save
									</button>
									<button
										type="button"
										onClick={() => setEditingId(null)}
										className="text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
									>
										Cancel
									</button>
								</div>
							) : (
								<div className="flex items-center gap-3">
									<div className="flex-1 min-w-0">
										<p className="text-sm truncate">{item.name}</p>
										<p className="text-xs text-zinc-500">
											{formatServings(item.servings)} · {item.calories} cal · P{" "}
											{item.proteinG}g · F {item.fatG}g · C {item.carbsG}g
										</p>
									</div>
									<button
										type="button"
										onClick={() => startEdit(item)}
										className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
									>
										Edit
									</button>
									<button
										type="button"
										onClick={() => handleDelete(item.id)}
										disabled={pending}
										aria-label="Remove"
										className="text-zinc-400 hover:text-red-600 disabled:opacity-50"
									>
										×
									</button>
								</div>
							)}
						</li>
					))}
				</ul>
			)}

			{addOpen ? (
				<AddMealItemDialog
					date={date}
					mealType={mealType}
					mealLabel={label}
					foods={foods}
					onClose={() => setAddOpen(false)}
				/>
			) : null}
		</section>
	);
}

function formatServings(n: number): string {
	const rounded = Math.round(n * 100) / 100;
	return `${rounded} serving${rounded === 1 ? "" : "s"}`;
}
