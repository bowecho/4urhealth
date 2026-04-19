import { Suspense } from "react";
import { LoginForm } from "@/components/auth-forms";
import { isPlaywrightHarnessEnabled } from "@/lib/runtime-flags";

export default function LoginPage() {
	return (
		<div className="rounded-3xl border border-zinc-200/80 bg-white/90 p-6 shadow-[0_24px_80px_-48px_rgba(24,24,27,0.45)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/85 sm:p-7">
			<div className="mb-5">
				<h2 className="text-xl font-semibold tracking-tight">Sign in</h2>
				<p className="mt-1 text-sm text-zinc-500">
					Use the account that already belongs to this deployment.
				</p>
			</div>
			<Suspense>
				<LoginForm />
			</Suspense>
			<p className="mt-4 text-sm text-zinc-500">
				{isPlaywrightHarnessEnabled()
					? "Public signup is still disabled in production. This local server enables it only for e2e runs."
					: "Account creation is disabled on this deployment."}
			</p>
		</div>
	);
}
