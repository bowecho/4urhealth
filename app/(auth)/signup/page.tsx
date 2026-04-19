import Link from "next/link";
import { SignupForm } from "@/components/auth-forms";

export default function SignupPage() {
	return (
		<div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
			<h2 className="text-lg font-semibold mb-4">Create account</h2>
			<SignupForm />
			<p className="mt-4 text-sm text-zinc-500">
				Already have an account?{" "}
				<Link href="/login" className="font-medium text-zinc-900 underline dark:text-zinc-100">
					Sign in
				</Link>
			</p>
		</div>
	);
}
