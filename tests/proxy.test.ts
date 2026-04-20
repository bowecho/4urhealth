import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionCookie } = vi.hoisted(() => ({
	getSessionCookie: vi.fn(),
}));

vi.mock("better-auth/cookies", () => ({
	getSessionCookie,
}));

async function loadProxy(playwright?: string) {
	vi.resetModules();
	vi.clearAllMocks();
	if (playwright === undefined) delete process.env.PLAYWRIGHT;
	else process.env.PLAYWRIGHT = playwright;
	return import("@/proxy");
}

describe("proxy auth protection", () => {
	beforeEach(() => {
		delete process.env.PLAYWRIGHT;
	});

	it("redirects unauthenticated protected routes to login with a next param", async () => {
		getSessionCookie.mockReturnValue(null);
		const { proxy } = await loadProxy();

		const response = await proxy(
			new NextRequest("https://4urhealth.vercel.app/settings"),
		);

		expect(response.headers.get("location")).toBe(
			"https://4urhealth.vercel.app/login?next=%2Fsettings",
		);
	});

	it("does not allow public signup outside the playwright harness", async () => {
		getSessionCookie.mockReturnValue(null);
		const { proxy } = await loadProxy();

		const response = await proxy(
			new NextRequest("https://4urhealth.vercel.app/signup"),
		);

		expect(response.headers.get("location")).toBe(
			"https://4urhealth.vercel.app/login?next=%2Fsignup",
		);
	});

	it("allows signup only when the playwright harness is enabled", async () => {
		getSessionCookie.mockReturnValue(null);
		const { proxy } = await loadProxy("1");

		const response = await proxy(
			new NextRequest("https://4urhealth.vercel.app/signup"),
		);

		expect(response.headers.get("x-middleware-next")).toBe("1");
	});

	it("redirects authenticated users away from public auth routes", async () => {
		getSessionCookie.mockReturnValue("session-token");
		const { proxy } = await loadProxy();

		const response = await proxy(
			new NextRequest("https://4urhealth.vercel.app/login"),
		);

		expect(response.headers.get("location")).toBe(
			"https://4urhealth.vercel.app/",
		);
	});
});
