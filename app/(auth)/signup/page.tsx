import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth-forms";
import { isPlaywrightHarnessEnabled } from "@/lib/runtime-flags";

export default function SignupPage() {
	if (isPlaywrightHarnessEnabled()) {
		return (
			<div className="rounded-3xl border border-zinc-200/80 bg-white/90 p-6 shadow-[0_24px_80px_-48px_rgba(24,24,27,0.45)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/85 sm:p-7">
				<div className="mb-5">
					<h2 className="text-xl font-semibold tracking-tight">
						Create account
					</h2>
					<p className="mt-1 text-sm text-zinc-500">
						Local-only signup is enabled for Playwright verification.
					</p>
				</div>
				<SignupForm />
			</div>
		);
	}

	redirect("/login");
}
