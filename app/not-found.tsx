import Link from "next/link";

export default function NotFound() {
	return (
		<main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
			<h1 className="text-xl font-semibold">Not found</h1>
			<p className="text-sm text-zinc-500 mt-2">That page doesn't exist.</p>
			<Link
				href="/"
				className="mt-4 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
			>
				Back to Today
			</Link>
		</main>
	);
}
