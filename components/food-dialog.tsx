"use client";
import { type FormEvent, useId, useState } from "react";
import type { FoodInput } from "@/app/(app)/foods/schema";
import { ModalShell } from "@/components/modal-shell";
import { SteppableNumberInput } from "@/components/steppable-number-input";
import { parseRequiredNumber } from "@/lib/form";
import { useEscapeKey } from "@/lib/use-escape-key";

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
	"theme-input w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100 dark:focus:ring-zinc-100";
const LABEL = "block text-xs font-medium mb-1 text-zinc-600 dark:text-zinc-400";

export function FoodDialog({
	initial,
	onSubmit,
	onCancel,
	embedded = false,
	title,
	description,
	submitLabel,
	servingsField,
}: {
	initial: FoodDialogInitial | null;
	onSubmit: (input: FoodInput) => Promise<void>;
	onCancel: () => void;
	embedded?: boolean;
	title?: string;
	description?: string;
	submitLabel?: string;
	servingsField?: {
		value: string;
		onChange: (value: string) => void;
		label?: string;
	};
}) {
	useEscapeKey(onCancel);

	const form = (
		<FoodDialogForm
			initial={initial}
			onSubmit={onSubmit}
			onCancel={onCancel}
			title={title}
			description={description}
			submitLabel={submitLabel}
			servingsField={servingsField}
			className={
				embedded
					? "space-y-4"
					: "theme-surface-strong relative w-[95vw] max-w-md rounded-lg bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 p-5 space-y-4"
			}
		/>
	);

	if (embedded) return form;

	return <ModalShell onClose={onCancel}>{form}</ModalShell>;
}

function FoodDialogForm({
	initial,
	onSubmit,
	onCancel,
	title,
	description,
	submitLabel,
	servingsField,
	className,
}: {
	initial: FoodDialogInitial | null;
	onSubmit: (input: FoodInput) => Promise<void>;
	onCancel: () => void;
	title?: string;
	description?: string;
	submitLabel?: string;
	servingsField?: {
		value: string;
		onChange: (value: string) => void;
		label?: string;
	};
	className: string;
}) {
	const [name, setName] = useState(initial?.name ?? "");
	const [brand, setBrand] = useState(initial?.brand ?? "");
	const [servingSize, setServingSize] = useState(
		(initial?.servingSize ?? 1).toString(),
	);
	const [servingUnit, setServingUnit] = useState(
		initial?.servingUnit ?? "serving",
	);
	const [calories, setCalories] = useState((initial?.calories ?? 0).toString());
	const [proteinG, setProteinG] = useState((initial?.proteinG ?? 0).toString());
	const [fatG, setFatG] = useState((initial?.fatG ?? 0).toString());
	const [carbsG, setCarbsG] = useState((initial?.carbsG ?? 0).toString());
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const servingSizeId = useId();
	const servingsId = useId();
	const proteinId = useId();
	const fatId = useId();
	const carbsId = useId();

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setError(null);
		setSubmitting(true);
		try {
			const parsedServingSize = parseRequiredNumber(
				servingSize,
				"Serving size",
			);
			const parsedCalories = parseRequiredNumber(
				calories,
				"Calories per serving",
			);
			const parsedProteinG = parseRequiredNumber(proteinG, "Protein");
			const parsedFatG = parseRequiredNumber(fatG, "Fat");
			const parsedCarbsG = parseRequiredNumber(carbsG, "Carbs");

			await onSubmit({
				name,
				brand: brand.trim() || undefined,
				servingSize: parsedServingSize,
				servingUnit,
				calories: parsedCalories,
				proteinG: parsedProteinG,
				fatG: parsedFatG,
				carbsG: parsedCarbsG,
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save");
			setSubmitting(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className={className}>
			<h2 className="text-lg font-semibold">
				{title ?? (initial ? "Edit food" : "New food")}
			</h2>
			{description ? (
				<p className="text-sm text-zinc-500 dark:text-zinc-400">
					{description}
				</p>
			) : null}

			<div>
				<label htmlFor="food-name" className={LABEL}>
					Name
				</label>
				<input
					id="food-name"
					type="text"
					required
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
					<label htmlFor={servingSizeId} className={LABEL}>
						Serving size
					</label>
					<SteppableNumberInput
						id={servingSizeId}
						value={servingSize}
						onChange={setServingSize}
						min={0.01}
						required
						inputClassName={`${INPUT} pr-10`}
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

			{servingsField ? (
				<div>
					<label htmlFor={servingsId} className={LABEL}>
						{servingsField.label ?? "Servings"}
					</label>
					<SteppableNumberInput
						id={servingsId}
						value={servingsField.value}
						onChange={servingsField.onChange}
						min={0.01}
						required
						inputClassName={`${INPUT} pr-10`}
					/>
				</div>
			) : null}

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
					onChange={(e) => setCalories(e.target.value)}
					className={INPUT}
				/>
			</div>

			<div className="grid grid-cols-3 gap-3">
				<div>
					<label htmlFor={proteinId} className={LABEL}>
						Protein (g)
					</label>
					<SteppableNumberInput
						id={proteinId}
						value={proteinG}
						onChange={setProteinG}
						min={0}
						required
						inputClassName={`${INPUT} pr-10`}
					/>
				</div>
				<div>
					<label htmlFor={fatId} className={LABEL}>
						Fat (g)
					</label>
					<SteppableNumberInput
						id={fatId}
						value={fatG}
						onChange={setFatG}
						min={0}
						required
						inputClassName={`${INPUT} pr-10`}
					/>
				</div>
				<div>
					<label htmlFor={carbsId} className={LABEL}>
						Carbs (g)
					</label>
					<SteppableNumberInput
						id={carbsId}
						value={carbsG}
						onChange={setCarbsG}
						min={0}
						required
						inputClassName={`${INPUT} pr-10`}
					/>
				</div>
			</div>

			{error ? <p className="text-sm text-red-600">{error}</p> : null}

			<div className="flex gap-2 justify-end pt-2">
				<button
					type="button"
					onClick={onCancel}
					className="theme-secondary-button rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={submitting}
					className="theme-primary-button rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
				>
					{submitting ? "Saving…" : (submitLabel ?? "Save")}
				</button>
			</div>
		</form>
	);
}
