export default function AuthLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<main className="flex-1 bg-[radial-gradient(circle_at_top,_rgba(161,161,170,0.12),_transparent_42%)] dark:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_36%)]">
			<div className="mx-auto flex min-h-full w-full max-w-5xl items-center justify-center px-6 py-12">
				<div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
					<section className="hidden lg:block">
						<div className="max-w-xl space-y-5">
							<p className="text-sm font-medium uppercase tracking-[0.24em] text-zinc-500">
								4urhealth
							</p>
							<h1 className="text-5xl font-semibold tracking-tight text-balance">
								A quiet place to track food, weight, and patterns that matter.
							</h1>
							<p className="max-w-lg text-base leading-7 text-zinc-600 dark:text-zinc-400">
								Built for fast daily use: clear targets, reusable meals, and
								historical logs that stay accurate as your catalog changes.
							</p>
						</div>
					</section>
					<div className="w-full max-w-sm justify-self-center lg:justify-self-end">
						<div className="mb-8 text-center lg:hidden">
							<h1 className="text-3xl font-semibold tracking-tight">
								4urhealth
							</h1>
							<p className="mt-1 text-sm text-zinc-500">
								Personal nutrition tracker
							</p>
						</div>
						{children}
					</div>
				</div>
			</div>
		</main>
	);
}
