import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";
import { isPlaywrightHarnessEnabled } from "@/lib/runtime-flags";

const PUBLIC_PATHS = isPlaywrightHarnessEnabled()
	? ["/login", "/signup"]
	: ["/login"];

export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const sessionCookie = getSessionCookie(request);
	const isPublic = PUBLIC_PATHS.some(
		(p) => pathname === p || pathname.startsWith(`${p}/`),
	);

	if (!sessionCookie && !isPublic) {
		const url = new URL("/login", request.url);
		if (pathname !== "/") url.searchParams.set("next", pathname);
		return NextResponse.redirect(url);
	}

	if (sessionCookie && isPublic) {
		return NextResponse.redirect(new URL("/", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		"/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.webmanifest|icons).*)",
	],
};
