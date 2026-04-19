import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { requireSession } from "@/lib/auth-server";

export default async function AppLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await requireSession();
	if (!session.user.onboardedAt) redirect("/onboarding");

	return (
		<>
			<AppNav />
			{children}
		</>
	);
}
