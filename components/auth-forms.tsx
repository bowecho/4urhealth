"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";
import { signIn, signUp } from "@/lib/auth-client";

const INPUT =
	"w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100 dark:focus:ring-zinc-100";

const BUTTON =
	"w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200";

export function LoginForm() {
	const router = useRouter();
	const params = useSearchParams();
	const next = params.get("next") || "/";

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	async function onSubmit(e: FormEvent) {
		e.preventDefault();
		setError(null);
		setSubmitting(true);
		const { error: err } = await signIn.email({ email, password });
		setSubmitting(false);
		if (err) {
			setError(err.message || "Sign-in failed");
			return;
		}
		router.push(next);
		router.refresh();
	}

	return (
		<form onSubmit={onSubmit} className="space-y-4">
			<div>
				<label htmlFor="email" className="block text-sm font-medium mb-1">
					Email
				</label>
				<input
					id="email"
					type="email"
					autoComplete="email"
					required
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					className={INPUT}
				/>
			</div>
			<div>
				<label htmlFor="password" className="block text-sm font-medium mb-1">
					Password
				</label>
				<input
					id="password"
					type="password"
					autoComplete="current-password"
					required
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					className={INPUT}
				/>
			</div>
			{error ? <p className="text-sm text-red-600">{error}</p> : null}
			<button type="submit" disabled={submitting} className={BUTTON}>
				{submitting ? "Signing in…" : "Sign in"}
			</button>
		</form>
	);
}

export function SignupForm() {
	const router = useRouter();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	async function onSubmit(e: FormEvent) {
		e.preventDefault();
		setError(null);
		if (password.length < 10) {
			setError("Password must be at least 10 characters");
			return;
		}
		setSubmitting(true);
		const { error: err } = await signUp.email({ name, email, password });
		setSubmitting(false);
		if (err) {
			setError(err.message || "Sign-up failed");
			return;
		}
		router.push("/onboarding");
		router.refresh();
	}

	return (
		<form onSubmit={onSubmit} className="space-y-4">
			<div>
				<label htmlFor="name" className="block text-sm font-medium mb-1">
					Name
				</label>
				<input
					id="name"
					type="text"
					autoComplete="name"
					required
					value={name}
					onChange={(e) => setName(e.target.value)}
					className={INPUT}
				/>
			</div>
			<div>
				<label htmlFor="email" className="block text-sm font-medium mb-1">
					Email
				</label>
				<input
					id="email"
					type="email"
					autoComplete="email"
					required
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					className={INPUT}
				/>
			</div>
			<div>
				<label htmlFor="password" className="block text-sm font-medium mb-1">
					Password
				</label>
				<input
					id="password"
					type="password"
					autoComplete="new-password"
					required
					minLength={10}
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					className={INPUT}
				/>
				<p className="mt-1 text-xs text-zinc-500">At least 10 characters.</p>
			</div>
			{error ? <p className="text-sm text-red-600">{error}</p> : null}
			<button type="submit" disabled={submitting} className={BUTTON}>
				{submitting ? "Creating account…" : "Create account"}
			</button>
		</form>
	);
}
