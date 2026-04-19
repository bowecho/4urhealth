import { requireSession } from "@/lib/auth-server";

export default async function OnboardingPage() {
	const session = await requireSession();

	return (
		<main className="flex-1 p-6 max-w-lg mx-auto w-full">
			<h1 className="text-2xl font-semibold mb-2">Welcome, {session.user.name}</h1>
			<p className="text-zinc-500 mb-6">
				TDEE calculator is coming in the next milestone. For now, your account is set up.
			</p>
		</main>
	);
}
