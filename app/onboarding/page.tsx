import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding-form";
import { requireSession } from "@/lib/auth-server";

export default async function OnboardingPage() {
	const session = await requireSession();
	if (session.user.onboardedAt) redirect("/");

	return (
		<main className="flex-1 p-6 max-w-lg mx-auto w-full">
			<h1 className="text-2xl font-semibold mb-1">Welcome, {session.user.name}</h1>
			<p className="text-sm text-zinc-500 mb-6">
				A few details so we can estimate your daily calorie and macro targets. You can change these any time in settings.
			</p>
			<OnboardingForm />
		</main>
	);
}
