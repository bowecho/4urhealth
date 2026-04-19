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
			<nav className="max-w-3xl mx-auto w-full px-4 h-14 flex items-center gap-1">
				<Link href="/" className="text-sm font-semibold mr-4">
					4urhealth
				</Link>
				<div className="flex gap-1 flex-1">
					{LINKS.map((l) => {
						const active =
							l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
						return (
							<Link
								key={l.href}
								href={l.href}
								className={`px-3 py-1.5 text-sm rounded-md ${
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
				<form action={signOutAction}>
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
