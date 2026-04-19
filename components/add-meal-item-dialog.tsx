"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { addMealItemAction } from "@/app/(app)/day/actions";
import type { FoodOption } from "@/components/day-view";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export function AddMealItemDialog({
	date,
	mealType,
	mealLabel,
	foods,
	onClose,
}: {
	date: string;
	mealType: MealType;
	mealLabel: string;
	foods: FoodOption[];
	onClose: () => void;
}) {
	const ref = useRef<HTMLDialogElement>(null);
	const [query, setQuery] = useState("");
	const [selected, setSelected] = useState<FoodOption | null>(null);
	const [servings, setServings] = useState(1);
	const [error, setError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		el.showModal();
		return () => {
			if (el.open) el.close();
		};
	}, []);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return foods.slice(0, 50);
		return foods
			.filter(
				(f) =>
					f.name.toLowerCase().includes(q) ||
					(f.brand?.toLowerCase().includes(q) ?? false),
			)
			.slice(0, 50);
	}, [foods, query]);

	function handleConfirm() {
		if (!selected) return;
		setError(null);
		startTransition(async () => {
			try {
				await addMealItemAction({
					date,
					mealType,
					foodItemId: selected.id,
					servings,
				});
				onClose();
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to add");
			}
		});
	}

	return (
		<dialog
			ref={ref}
			onClose={onClose}
			className="rounded-lg p-0 backdrop:bg-black/40 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 w-[95vw] max-w-md"
		>
			<div className="p-5 space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold">Add to {mealLabel}</h2>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close"
						className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
					>
						×
					</button>
				</div>

				{selected ? (
					<div className="space-y-4">
						<div className="rounded-md border border-zinc-200 dark:border-zinc-800 p-3">
							<p className="font-medium">{selected.name}</p>
							<p className="text-xs text-zinc-500">
								per {selected.servingSize} {selected.servingUnit}:{" "}
								{selected.calories} cal · P {selected.proteinG}g · F{" "}
								{selected.fatG}g · C {selected.carbsG}g
							</p>
						</div>
						<div>
							<label
								htmlFor="servings"
								className="block text-xs font-medium mb-1 text-zinc-600 dark:text-zinc-400"
							>
								Servings
							</label>
							<input
								id="servings"
								type="number"
								min={0.01}
								step={0.1}
								value={servings}
								onChange={(e) => setServings(Number(e.target.value))}
								className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
							/>
							<p className="mt-2 text-xs text-zinc-500">
								Total: {Math.round(selected.calories * servings)} cal · P{" "}
								{(selected.proteinG * servings).toFixed(1)}g · F{" "}
								{(selected.fatG * servings).toFixed(1)}g · C{" "}
								{(selected.carbsG * servings).toFixed(1)}g
							</p>
						</div>
						{error ? <p className="text-sm text-red-600">{error}</p> : null}
						<div className="flex gap-2 justify-end">
							<button
								type="button"
								onClick={() => setSelected(null)}
								className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
							>
								Back
							</button>
							<button
								type="button"
								onClick={handleConfirm}
								disabled={pending || servings <= 0}
								className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
							>
								{pending ? "Adding…" : "Add"}
							</button>
						</div>
					</div>
				) : (
					<>
						<input
							type="search"
							autoFocus
							placeholder="Search foods…"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
						/>
						{foods.length === 0 ? (
							<p className="text-sm text-zinc-500 py-6 text-center">
								No foods yet. Add one on the Foods page first.
							</p>
						) : filtered.length === 0 ? (
							<p className="text-sm text-zinc-500 py-6 text-center">
								No matches.
							</p>
						) : (
							<ul className="max-h-72 overflow-y-auto -mx-1">
								{filtered.map((f) => (
									<li key={f.id}>
										<button
											type="button"
											onClick={() => setSelected(f)}
											className="w-full text-left px-3 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900"
										>
											<p className="text-sm font-medium">{f.name}</p>
											<p className="text-xs text-zinc-500">
												{f.servingSize} {f.servingUnit} · {f.calories} cal
											</p>
										</button>
									</li>
								))}
							</ul>
						)}
					</>
				)}
			</div>
		</dialog>
	);
}
