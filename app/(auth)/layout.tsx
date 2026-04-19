export default function AuthLayout({ children }: { children: React.ReactNode }) {
	return (
		<main className="flex-1 flex items-center justify-center p-6">
			<div className="w-full max-w-sm">
				<div className="mb-8 text-center">
					<h1 className="text-3xl font-semibold tracking-tight">4urhealth</h1>
					<p className="mt-1 text-sm text-zinc-500">Personal nutrition tracker</p>
				</div>
				{children}
			</div>
		</main>
	);
}
