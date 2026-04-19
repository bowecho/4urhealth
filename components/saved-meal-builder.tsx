"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
	createSavedMealAction,
	updateSavedMealAction,
} from "@/app/(app)/meals/actions";
import type { FoodOption } from "@/components/day-view";
import type { SavedMealDetail } from "@/components/meals-view";

type DraftItem = {
	key: string;
	foodId: string;
	foodName: string;
	servings: number;
	calories: number;
	proteinG: number;
	fatG: number;
	carbsG: number;
};

export function SavedMealBuilder({
	foods,
	initial,
	onClose,
}: {
	foods: FoodOption[];
	initial: SavedMealDetail | null;
	onClose: () => void;
}) {
	const [name, setName] = useState(initial?.name ?? "");
	const [items, setItems] = useState<DraftItem[]>(
		() =>
			initial?.items.map((it) => ({ ...it, key: crypto.randomUUID() })) ?? [],
	);
	const [query, setQuery] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") onClose();
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return foods.slice(0, 20);
		return foods
			.filter(
				(f) =>
					f.name.toLowerCase().includes(q) ||
					(f.brand?.toLowerCase().includes(q) ?? false),
			)
			.slice(0, 20);
	}, [foods, query]);

	function addFood(food: FoodOption) {
		setItems((prev) => [
			...prev,
			{
				key: crypto.randomUUID(),
				foodId: food.id,
				foodName: food.name,
				servings: 1,
				calories: food.calories,
				proteinG: food.proteinG,
				fatG: food.fatG,
				carbsG: food.carbsG,
			},
		]);
		setQuery("");
	}

	function updateServings(idx: number, servings: number) {
		setItems((prev) =>
			prev.map((it, i) => (i === idx ? { ...it, servings } : it)),
		);
	}

	function removeItem(idx: number) {
		setItems((prev) => prev.filter((_, i) => i !== idx));
	}

	function handleSave() {
		setError(null);
		if (!name.trim()) {
			setError("Name is required");
			return;
		}
		if (items.length === 0) {
			setError("Add at least one food");
			return;
		}
		const payload = {
			name: name.trim(),
			items: items.map((it) => ({
				foodItemId: it.foodId,
				servings: it.servings,
			})),
		};
		startTransition(async () => {
			try {
				if (initial) await updateSavedMealAction(initial.id, payload);
				else await createSavedMealAction(payload);
				onClose();
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to save");
			}
		});
	}

	const totals = items.reduce(
		(acc, it) => {
			acc.calories += it.calories * it.servings;
			acc.proteinG += it.proteinG * it.servings;
			acc.fatG += it.fatG * it.servings;
			acc.carbsG += it.carbsG * it.servings;
			return acc;
		},
		{ calories: 0, proteinG: 0, fatG: 0, carbsG: 0 },
	);

	return (
		<div className="fixed inset-0 z-10 flex items-center justify-center p-4">
			<button
				type="button"
				aria-label="Close dialog"
				className="absolute inset-0 bg-black/40"
				onClick={onClose}
			/>
			<div className="relative w-[95vw] max-w-lg rounded-lg bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 p-5 space-y-4 max-h-[85vh] overflow-y-auto">
				<h2 className="text-lg font-semibold">
					{initial ? "Edit saved meal" : "New saved meal"}
				</h2>

				<div>
					<label
						htmlFor="meal-name"
						className="block text-xs font-medium mb-1 text-zinc-600 dark:text-zinc-400"
					>
						Name
					</label>
					<input
						id="meal-name"
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
					/>
				</div>

				<div>
					<p className="text-xs font-medium mb-1 text-zinc-600 dark:text-zinc-400">
						Foods
					</p>
					{items.length === 0 ? (
						<p className="text-sm text-zinc-500 py-2">No foods added yet.</p>
					) : (
						<ul className="space-y-1">
							{items.map((it, i) => (
								<li key={it.key} className="flex items-center gap-2 text-sm">
									<span className="flex-1 truncate">{it.foodName}</span>
									<input
										type="number"
										min={0.01}
										step={0.1}
										value={it.servings}
										onChange={(e) => updateServings(i, Number(e.target.value))}
										className="w-20 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
										aria-label="servings"
									/>
									<button
										type="button"
										onClick={() => removeItem(i)}
										aria-label="Remove"
										className="text-zinc-400 hover:text-red-600"
									>
										×
									</button>
								</li>
							))}
						</ul>
					)}
					{items.length > 0 ? (
						<p className="mt-2 text-xs text-zinc-500">
							Total: {Math.round(totals.calories)} cal · P{" "}
							{totals.proteinG.toFixed(1)}g · F {totals.fatG.toFixed(1)}g · C{" "}
							{totals.carbsG.toFixed(1)}g
						</p>
					) : null}
				</div>

				<div>
					<p className="text-xs font-medium mb-1 text-zinc-600 dark:text-zinc-400">
						Add food
					</p>
					{foods.length === 0 ? (
						<p className="text-sm text-zinc-500">
							Create some food items on the Foods page first.
						</p>
					) : (
						<>
							<input
								type="search"
								placeholder="Search foods…"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
							/>
							<ul className="max-h-40 overflow-y-auto mt-1">
								{filtered.map((f) => (
									<li key={f.id}>
										<button
											type="button"
											onClick={() => addFood(f)}
											className="w-full text-left px-3 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 text-sm"
										>
											{f.name}{" "}
											<span className="text-xs text-zinc-500">
												· {f.calories} cal
											</span>
										</button>
									</li>
								))}
							</ul>
						</>
					)}
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
						onClick={handleSave}
						disabled={pending}
						className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
					>
						{pending ? "Saving…" : "Save"}
					</button>
				</div>
			</div>
		</div>
	);
}
