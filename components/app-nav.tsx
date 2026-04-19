"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/(app)/actions";

const LINKS = [
	{ href: "/", label: "Today" },
	{ href: "/weight", label: "Weight" },
	{ href: "/foods", label: "Foods" },
	{ href: "/meals", label: "Meals" },
	{ href: "/stats", label: "Stats" },
	{ href: "/settings", label: "Settings" },
];

export function AppNav() {
	const pathname = usePathname();
	return (
		<header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
			<nav className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-3 sm:h-14 sm:flex-row sm:items-center sm:gap-4 sm:py-0">
				<div className="flex items-center justify-between gap-3 sm:w-auto sm:shrink-0">
					<Link href="/" className="text-sm font-semibold">
						4urhealth
					</Link>
					<form action={signOutAction} className="shrink-0 sm:hidden">
						<button
							type="submit"
							className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
						>
							Sign out
						</button>
					</form>
				</div>
				<div className="grid grid-cols-3 gap-2 sm:flex sm:flex-1 sm:justify-center sm:gap-1">
					{LINKS.map((l) => {
						const active =
							l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
						return (
							<Link
								key={l.href}
								href={l.href}
								className={`px-3 py-1.5 text-sm rounded-md text-center ${
									active
										? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
										: "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900"
								}`}
							>
								{l.label}
							</Link>
						);
					})}
				</div>
				<form action={signOutAction} className="hidden shrink-0 sm:block">
					<button
						type="submit"
						className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
					>
						Sign out
					</button>
				</form>
			</nav>
		</header>
	);
}
