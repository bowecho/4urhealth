import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const INITIAL_ENV = { ...process.env };

const { getSessionCookie } = vi.hoisted(() => ({
	getSessionCookie: vi.fn(),
}));

vi.mock("better-auth/cookies", () => ({
	getSessionCookie,
}));

async function loadProxy(options?: {
	playwright?: string;
	nodeEnv?: string;
	vercel?: string;
}) {
	vi.resetModules();
	vi.clearAllMocks();
	if (options?.playwright === undefined) delete process.env.PLAYWRIGHT;
	else process.env.PLAYWRIGHT = options.playwright;
	if (options?.nodeEnv === undefined) {
		(process.env as Record<string, string | undefined>).NODE_ENV = "test";
	} else {
		(process.env as Record<string, string | undefined>).NODE_ENV =
			options.nodeEnv;
	}
	if (options?.vercel === undefined) delete process.env.VERCEL;
	else process.env.VERCEL = options.vercel;
	return import("@/proxy");
}

describe("proxy auth protection", () => {
	beforeEach(() => {
		process.env = { ...INITIAL_ENV, NODE_ENV: "test" };
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
		const { proxy } = await loadProxy({ playwright: "1" });

		const response = await proxy(
			new NextRequest("https://4urhealth.vercel.app/signup"),
		);

		expect(response.headers.get("x-middleware-next")).toBe("1");
	});

	it("does not enable public signup when PLAYWRIGHT is set in production", async () => {
		getSessionCookie.mockReturnValue(null);
		const { proxy } = await loadProxy({
			playwright: "1",
			nodeEnv: "production",
		});

		const response = await proxy(
			new NextRequest("https://4urhealth.vercel.app/signup"),
		);

		expect(response.headers.get("location")).toBe(
			"https://4urhealth.vercel.app/login?next=%2Fsignup",
		);
	});

	it("does not enable public signup when PLAYWRIGHT is set on Vercel", async () => {
		getSessionCookie.mockReturnValue(null);
		const { proxy } = await loadProxy({ playwright: "1", vercel: "1" });

		const response = await proxy(
			new NextRequest("https://4urhealth.vercel.app/signup"),
		);

		expect(response.headers.get("location")).toBe(
			"https://4urhealth.vercel.app/login?next=%2Fsignup",
		);
	});

	it("allows the playwright cleanup API through the proxy without a session", async () => {
		getSessionCookie.mockReturnValue(null);
		const { proxy } = await loadProxy({ playwright: "1" });

		const response = await proxy(
			new NextRequest("https://4urhealth.vercel.app/api/e2e/test-user"),
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
