"use client";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
	archiveFoodAction,
	createFoodAction,
	type FoodInput,
	unarchiveFoodAction,
	updateFoodAction,
} from "@/app/(app)/foods/actions";
import { FoodDialog } from "@/components/food-dialog";

export type Food = {
	id: string;
	name: string;
	brand: string | null;
	servingSize: number;
	servingUnit: string;
	calories: number;
	proteinG: number;
	fatG: number;
	carbsG: number;
	archivedAt: Date | null;
};

type DialogState = { mode: "create" } | { mode: "edit"; food: Food } | null;

export function FoodsList({
	items,
	showArchived,
}: {
	items: Food[];
	showArchived: boolean;
}) {
	const [query, setQuery] = useState("");
	const [dialog, setDialog] = useState<DialogState>(null);
	const [_pending, startTransition] = useTransition();

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return items;
		return items.filter(
			(f) =>
				f.name.toLowerCase().includes(q) ||
				(f.brand?.toLowerCase().includes(q) ?? false),
		);
	}, [items, query]);

	function handleSubmit(input: FoodInput, id?: string) {
		return new Promise<void>((resolve, reject) => {
			startTransition(async () => {
				try {
					if (id) await updateFoodAction(id, input);
					else await createFoodAction(input);
					setDialog(null);
					resolve();
				} catch (err) {
					reject(err);
				}
			});
		});
	}

	function handleArchive(food: Food) {
		startTransition(async () => {
			if (food.archivedAt) await unarchiveFoodAction(food.id);
			else await archiveFoodAction(food.id);
		});
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Foods</h1>
					<p className="text-sm text-zinc-500">
						Build the personal food catalog that powers logging and saved meals.
					</p>
				</div>
				<button
					type="button"
					onClick={() => setDialog({ mode: "create" })}
					className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
				>
					+ New food
				</button>
			</div>

			<div className="flex gap-2">
				<input
					type="search"
					placeholder="Search foods…"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
				/>
				<Link
					href={showArchived ? "/foods" : "/foods?archived=1"}
					className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
				>
					{showArchived ? "Active" : "Archived"}
				</Link>
			</div>

			{filtered.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-zinc-300 bg-white/70 px-6 py-10 text-center dark:border-zinc-700 dark:bg-zinc-950/60">
					<p className="text-base font-medium">
						{items.length === 0
							? showArchived
								? "No archived foods"
								: "No foods yet"
							: "No matches"}
					</p>
					<p className="mt-2 text-sm text-zinc-500">
						{items.length === 0
							? showArchived
								? "Archived items will show up here when you restore or clean up your catalog."
								: "Add your first food once, then reuse it everywhere in the app."
							: "Try a different search term or switch between active and archived items."}
					</p>
				</div>
			) : (
				<ul className="space-y-2">
					{filtered.map((f) => (
						<li
							key={f.id}
							className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white/80 p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80"
						>
							<div className="flex-1 min-w-0">
								<div className="flex items-baseline gap-2">
									<p className="font-medium truncate">{f.name}</p>
									{f.brand ? (
										<span className="text-xs text-zinc-500 truncate">
											{f.brand}
										</span>
									) : null}
								</div>
								<p className="text-xs text-zinc-500">
									{f.servingSize} {f.servingUnit} · {f.calories} cal · P{" "}
									{f.proteinG}g · F {f.fatG}g · C {f.carbsG}g
								</p>
							</div>
							<div className="flex gap-1 shrink-0">
								{f.archivedAt ? null : (
									<button
										type="button"
										onClick={() => setDialog({ mode: "edit", food: f })}
										className="text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
									>
										Edit
									</button>
								)}
								<button
									type="button"
									onClick={() => handleArchive(f)}
									className="text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
								>
									{f.archivedAt ? "Restore" : "Archive"}
								</button>
							</div>
						</li>
					))}
				</ul>
			)}

			{dialog ? (
				<FoodDialog
					initial={dialog.mode === "edit" ? dialog.food : null}
					onCancel={() => setDialog(null)}
					onSubmit={(input) =>
						handleSubmit(
							input,
							dialog.mode === "edit" ? dialog.food.id : undefined,
						)
					}
				/>
			) : null}
		</div>
	);
}
