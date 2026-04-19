"use client";
import { type FormEvent, useEffect, useRef, useState } from "react";
import type { FoodInput } from "@/app/(app)/foods/actions";

export type FoodDialogInitial = {
	name: string;
	brand: string | null;
	servingSize: number;
	servingUnit: string;
	calories: number;
	proteinG: number;
	fatG: number;
	carbsG: number;
};

const INPUT =
	"w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100 dark:focus:ring-zinc-100";
const LABEL = "block text-xs font-medium mb-1 text-zinc-600 dark:text-zinc-400";

export function FoodDialog({
	initial,
	onSubmit,
	onCancel,
}: {
	initial: FoodDialogInitial | null;
	onSubmit: (input: FoodInput) => Promise<void>;
	onCancel: () => void;
}) {
	const ref = useRef<HTMLDialogElement>(null);
	const [name, setName] = useState(initial?.name ?? "");
	const [brand, setBrand] = useState(initial?.brand ?? "");
	const [servingSize, setServingSize] = useState(initial?.servingSize ?? 1);
	const [servingUnit, setServingUnit] = useState(
		initial?.servingUnit ?? "serving",
	);
	const [calories, setCalories] = useState(initial?.calories ?? 0);
	const [proteinG, setProteinG] = useState(initial?.proteinG ?? 0);
	const [fatG, setFatG] = useState(initial?.fatG ?? 0);
	const [carbsG, setCarbsG] = useState(initial?.carbsG ?? 0);
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		el.showModal();
		return () => {
			if (el.open) el.close();
		};
	}, []);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setError(null);
		setSubmitting(true);
		try {
			await onSubmit({
				name,
				brand: brand.trim() || undefined,
				servingSize,
				servingUnit,
				calories,
				proteinG,
				fatG,
				carbsG,
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save");
			setSubmitting(false);
		}
	}

	return (
		<dialog
			ref={ref}
			onClose={onCancel}
			className="rounded-lg p-0 backdrop:bg-black/40 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 w-[95vw] max-w-md"
		>
			<form onSubmit={handleSubmit} className="p-5 space-y-4">
				<h2 className="text-lg font-semibold">
					{initial ? "Edit food" : "New food"}
				</h2>

				<div>
					<label htmlFor="food-name" className={LABEL}>
						Name
					</label>
					<input
						id="food-name"
						type="text"
						required
						autoFocus
						value={name}
						onChange={(e) => setName(e.target.value)}
						className={INPUT}
					/>
				</div>

				<div>
					<label htmlFor="food-brand" className={LABEL}>
						Brand (optional)
					</label>
					<input
						id="food-brand"
						type="text"
						value={brand}
						onChange={(e) => setBrand(e.target.value)}
						className={INPUT}
					/>
				</div>

				<div className="grid grid-cols-2 gap-3">
					<div>
						<label htmlFor="food-size" className={LABEL}>
							Serving size
						</label>
						<input
							id="food-size"
							type="number"
							min={0.01}
							step={0.01}
							required
							value={servingSize}
							onChange={(e) => setServingSize(Number(e.target.value))}
							className={INPUT}
						/>
					</div>
					<div>
						<label htmlFor="food-unit" className={LABEL}>
							Unit
						</label>
						<input
							id="food-unit"
							type="text"
							required
							placeholder="serving, g, cup…"
							value={servingUnit}
							onChange={(e) => setServingUnit(e.target.value)}
							className={INPUT}
						/>
					</div>
				</div>

				<div>
					<label htmlFor="food-cal" className={LABEL}>
						Calories per serving
					</label>
					<input
						id="food-cal"
						type="number"
						min={0}
						required
						value={calories}
						onChange={(e) => setCalories(Number(e.target.value))}
						className={INPUT}
					/>
				</div>

				<div className="grid grid-cols-3 gap-3">
					<div>
						<label htmlFor="food-p" className={LABEL}>
							Protein (g)
						</label>
						<input
							id="food-p"
							type="number"
							min={0}
							step={0.1}
							required
							value={proteinG}
							onChange={(e) => setProteinG(Number(e.target.value))}
							className={INPUT}
						/>
					</div>
					<div>
						<label htmlFor="food-f" className={LABEL}>
							Fat (g)
						</label>
						<input
							id="food-f"
							type="number"
							min={0}
							step={0.1}
							required
							value={fatG}
							onChange={(e) => setFatG(Number(e.target.value))}
							className={INPUT}
						/>
					</div>
					<div>
						<label htmlFor="food-c" className={LABEL}>
							Carbs (g)
						</label>
						<input
							id="food-c"
							type="number"
							min={0}
							step={0.1}
							required
							value={carbsG}
							onChange={(e) => setCarbsG(Number(e.target.value))}
							className={INPUT}
						/>
					</div>
				</div>

				{error ? <p className="text-sm text-red-600">{error}</p> : null}

				<div className="flex gap-2 justify-end pt-2">
					<button
						type="button"
						onClick={onCancel}
						className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={submitting}
						className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
					>
						{submitting ? "Saving…" : "Save"}
					</button>
				</div>
			</form>
		</dialog>
	);
}
