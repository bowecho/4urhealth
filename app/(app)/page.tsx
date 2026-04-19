import { requireSession } from "@/lib/auth-server";

export default async function TodayPage() {
	const session = await requireSession();

	return (
		<main className="flex-1 p-6 max-w-3xl mx-auto w-full">
			<h1 className="text-2xl font-semibold mb-4">Today</h1>
			<p className="text-zinc-600 dark:text-zinc-400">
				Welcome, {session.user.name}. Dashboard coming in the next milestone.
			</p>
		</main>
	);
}
