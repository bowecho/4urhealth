"use client";
import { useEffect, useId, useMemo, useState, useTransition } from "react";
import {
	addMealItemAction,
	addOneTimeMealItemAction,
} from "@/app/(app)/day/actions";
import { createFoodAction } from "@/app/(app)/foods/actions";
import type { FoodInput } from "@/app/(app)/foods/schema";
import type { FoodOption } from "@/components/day-view";
import { FoodDialog } from "@/components/food-dialog";
import { SteppableNumberInput } from "@/components/steppable-number-input";

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
	const [createMode, setCreateMode] = useState<"saved" | "one-time" | null>(
		null,
	);
	const [availableFoods, setAvailableFoods] = useState(foods);
	const [query, setQuery] = useState("");
	const [selected, setSelected] = useState<FoodOption | null>(null);
	const [servings, setServings] = useState("1");
	const [error, setError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();
	const servingsId = useId();
	const parsedServings = servings.trim() === "" ? Number.NaN : Number(servings);
	const validServings =
		Number.isFinite(parsedServings) && parsedServings >= 0.01;

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") onClose();
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return availableFoods.slice(0, 50);
		return availableFoods
			.filter(
				(f) =>
					f.name.toLowerCase().includes(q) ||
					(f.brand?.toLowerCase().includes(q) ?? false),
			)
			.slice(0, 50);
	}, [availableFoods, query]);

	function handleConfirm() {
		if (!selected) return;
		setError(null);
		startTransition(async () => {
			try {
				await addMealItemAction({
					date,
					mealType,
					foodItemId: selected.id,
					servings: parsedServings,
				});
				onClose();
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to add");
			}
		});
	}

	async function handleCreateFood(input: FoodInput) {
		const created = await createFoodAction(input);
		const nextFood: FoodOption = {
			id: created.id,
			name: created.name,
			brand: created.brand,
			servingSize: Number(created.servingSize),
			servingUnit: created.servingUnit,
			calories: created.calories,
			proteinG: Number(created.proteinG),
			fatG: Number(created.fatG),
			carbsG: Number(created.carbsG),
		};
		setAvailableFoods((current) => [nextFood, ...current]);
		setSelected(nextFood);
		setCreateMode(null);
	}

	async function handleCreateOneTimeFood(input: FoodInput) {
		const parsedServings =
			servings.trim() === "" ? Number.NaN : Number(servings);
		if (!Number.isFinite(parsedServings) || parsedServings < 0.01) {
			throw new Error("Servings must be at least 0.01");
		}
		await addOneTimeMealItemAction({
			date,
			mealType,
			servings: parsedServings,
			...input,
		});
		onClose();
	}

	return (
		<div className="fixed inset-0 z-10 flex items-center justify-center p-4">
			<button
				type="button"
				aria-label="Close dialog"
				className="absolute inset-0 bg-black/40"
				onClick={onClose}
			/>
			<div className="theme-surface-strong relative w-[95vw] max-w-md rounded-lg bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 p-5 space-y-4">
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

				{createMode === "saved" ? (
					<FoodDialog
						embedded
						title="New food"
						initial={{
							name: query.trim(),
							brand: "",
							servingSize: 1,
							servingUnit: "serving",
							calories: 0,
							proteinG: 0,
							fatG: 0,
							carbsG: 0,
						}}
						onCancel={() => setCreateMode(null)}
						onSubmit={handleCreateFood}
					/>
				) : createMode === "one-time" ? (
					<FoodDialog
						embedded
						title="One-time food"
						description={`Adds this only to ${mealLabel.toLowerCase()} and won’t save it to your foods list.`}
						submitLabel={`Add to ${mealLabel}`}
						servingsField={{
							value: servings,
							onChange: setServings,
						}}
						initial={{
							name: query.trim(),
							brand: "",
							servingSize: 1,
							servingUnit: "serving",
							calories: 0,
							proteinG: 0,
							fatG: 0,
							carbsG: 0,
						}}
						onCancel={() => setCreateMode(null)}
						onSubmit={handleCreateOneTimeFood}
					/>
				) : selected ? (
					<div className="space-y-4">
						<div className="theme-surface rounded-md border border-zinc-200 dark:border-zinc-800 p-3">
							<p className="font-medium">{selected.name}</p>
							<p className="text-xs text-zinc-500">
								per {selected.servingSize} {selected.servingUnit}:{" "}
								{selected.calories} cal · P {selected.proteinG}g · F{" "}
								{selected.fatG}g · C {selected.carbsG}g
							</p>
						</div>
						<div>
							<label
								htmlFor={servingsId}
								className="block text-xs font-medium mb-1 text-zinc-600 dark:text-zinc-400"
							>
								Servings
							</label>
							<SteppableNumberInput
								id={servingsId}
								value={servings}
								onChange={setServings}
								min={0.01}
								inputClassName="theme-input w-full rounded-md border border-zinc-300 bg-white px-3 py-2 pr-10 text-sm dark:border-zinc-700 dark:bg-zinc-900"
								wrapperClassName="w-full"
							/>
							<p className="mt-2 text-xs text-zinc-500">
								Total:{" "}
								{Math.round(
									selected.calories * (validServings ? parsedServings : 0),
								)}{" "}
								cal · P{" "}
								{(
									selected.proteinG * (validServings ? parsedServings : 0)
								).toFixed(1)}
								g · F{" "}
								{(selected.fatG * (validServings ? parsedServings : 0)).toFixed(
									1,
								)}
								g · C{" "}
								{(
									selected.carbsG * (validServings ? parsedServings : 0)
								).toFixed(1)}
								g
							</p>
						</div>
						{error ? <p className="text-sm text-red-600">{error}</p> : null}
						<div className="flex gap-2 justify-end">
							<button
								type="button"
								onClick={() => setSelected(null)}
								className="theme-secondary-button rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
							>
								Back
							</button>
							<button
								type="button"
								onClick={handleConfirm}
								disabled={pending || !validServings}
								className="theme-primary-button rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
							>
								{pending ? "Adding…" : "Add"}
							</button>
						</div>
					</div>
				) : (
					<>
						<input
							type="search"
							placeholder="Search foods…"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							className="theme-input w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
						/>
						<div className="flex items-center justify-between gap-2">
							<p className="text-xs text-zinc-500">
								Can&apos;t find it? Create a food without leaving this screen.
							</p>
							<div className="flex shrink-0 gap-2">
								<button
									type="button"
									onClick={() => setCreateMode("saved")}
									className="theme-secondary-button rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
								>
									+ New food
								</button>
								<button
									type="button"
									onClick={() => setCreateMode("one-time")}
									className="theme-secondary-button rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
								>
									+ One-time food
								</button>
							</div>
						</div>
						{availableFoods.length === 0 ? (
							<p className="text-sm text-zinc-500 py-6 text-center">
								No foods yet. Create one to get started.
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
		</div>
	);
}
