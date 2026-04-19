import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-server";
import { signOutAction } from "./actions";

export default async function TodayPage() {
	const session = await requireSession();

	if (!session.user.onboardedAt) {
		redirect("/onboarding");
	}

	return (
		<main className="flex-1 p-6 max-w-3xl mx-auto w-full">
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-semibold">Today</h1>
				<form action={signOutAction}>
					<button
						type="submit"
						className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
					>
						Sign out
					</button>
				</form>
			</div>
			<p className="text-zinc-600 dark:text-zinc-400">
				Welcome, {session.user.name}. Dashboard coming in the next milestone.
			</p>
		</main>
	);
}
