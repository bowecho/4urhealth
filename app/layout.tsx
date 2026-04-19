import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import Script from "next/script";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { getSession } from "@/lib/auth-server";
import {
	resolveThemePreference,
	THEME_BOOTSTRAP_SCRIPT,
	THEME_COLORS,
	THEME_COOKIE_NAME,
} from "@/lib/theme";
import "./globals.css";

const inter = Inter({
	variable: "--font-sans",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "4urhealth",
	description: "Personal nutrition and weight tracker",
	applicationName: "4urhealth",
	appleWebApp: {
		capable: true,
		statusBarStyle: "default",
		title: "4urhealth",
	},
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
	colorScheme: "light dark",
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
		{ media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
	],
};

export default async function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const cookieStore = await cookies();
	const session = await getSession();
	const cookieTheme = resolveThemePreference(
		cookieStore.get(THEME_COOKIE_NAME)?.value,
	);
	const userTheme = resolveThemePreference(session?.user.themePreference);
	const resolvedTheme = userTheme ?? cookieTheme;

	return (
		<html
			lang="en"
			className={`${inter.variable} h-full antialiased${
				resolvedTheme === "dark" ? " dark" : ""
			}`}
			data-theme-preference={resolvedTheme ?? undefined}
			style={resolvedTheme ? { colorScheme: resolvedTheme } : undefined}
			suppressHydrationWarning
		>
			<body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
				<Script id="theme-bootstrap" strategy="beforeInteractive">
					{THEME_BOOTSTRAP_SCRIPT}
				</Script>
				<ServiceWorkerRegister />
				{children}
			</body>
		</html>
	);
}
