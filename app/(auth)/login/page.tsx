import { Suspense } from "react";
import { LoginForm } from "@/components/auth-forms";

export default function LoginPage() {
	return (
		<div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
			<h2 className="text-lg font-semibold mb-4">Sign in</h2>
			<Suspense>
				<LoginForm />
			</Suspense>
			<p className="mt-4 text-sm text-zinc-500">
				Account creation is disabled on this deployment.
			</p>
		</div>
	);
}
