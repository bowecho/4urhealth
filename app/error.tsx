"use client";
import { useEffect } from "react";

export default function AppError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
			<h1 className="text-xl font-semibold">Something went wrong</h1>
			<p className="text-sm text-zinc-500 mt-2 max-w-md">
				{error.message || "An unexpected error occurred."}
			</p>
			<button
				type="button"
				onClick={reset}
				className="mt-4 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
			>
				Try again
			</button>
		</main>
	);
}
