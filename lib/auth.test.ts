import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const INITIAL_ENV = { ...process.env };

async function loadAuthModule(options?: {
	env?: Record<string, string | undefined>;
	playwrightHarness?: boolean;
}) {
	vi.resetModules();

	const betterAuth = vi.fn((config) => ({
		api: {},
		$Infer: { Session: {} },
		__config: config,
	}));
	const drizzleAdapter = vi.fn(() => "drizzle-adapter");
	const nextCookies = vi.fn(() => "next-cookies-plugin");
	const isPlaywrightHarnessEnabled = vi.fn(
		() => options?.playwrightHarness ?? false,
	);

	for (const key of [
		"BETTER_AUTH_URL",
		"NEXT_PUBLIC_APP_URL",
		"VERCEL_URL",
		"VERCEL_PROJECT_PRODUCTION_URL",
		"NODE_ENV",
		"PLAYWRIGHT",
	]) {
		delete process.env[key];
	}
	Object.assign(process.env, options?.env ?? {});

	vi.doMock("better-auth", () => ({
		betterAuth,
	}));
	vi.doMock("better-auth/adapters/drizzle", () => ({
		drizzleAdapter,
	}));
	vi.doMock("better-auth/next-js", () => ({
		nextCookies,
	}));
	vi.doMock("@/db", () => ({
		db: "db-client",
	}));
	vi.doMock("@/lib/runtime-flags", () => ({
		isPlaywrightHarnessEnabled,
	}));

	const module = await import("./auth");
	return {
		module,
		config: betterAuth.mock.calls[0]?.[0],
		drizzleAdapter,
		nextCookies,
		isPlaywrightHarnessEnabled,
	};
}

describe("auth config", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env = { ...INITIAL_ENV };
	});

	afterEach(() => {
		process.env = { ...INITIAL_ENV };
		vi.resetModules();
	});

	it("defaults to localhost with secure settings disabled outside the harness", async () => {
		const { config, drizzleAdapter, nextCookies, isPlaywrightHarnessEnabled } =
			await loadAuthModule();

		expect(isPlaywrightHarnessEnabled).toHaveBeenCalled();
		expect(drizzleAdapter).toHaveBeenCalledWith("db-client", {
			provider: "pg",
		});
		expect(nextCookies).toHaveBeenCalled();
		expect(config.baseURL).toEqual({
			allowedHosts: ["127.0.0.1:3000"],
			protocol: "http",
			fallback: "http://localhost:3000",
		});
		expect(config.emailAndPassword.disableSignUp).toBe(true);
		expect(config.rateLimit.enabled).toBe(true);
		expect(config.session.cookieCache).toEqual({ enabled: false });
	});

	it("derives canonical hosts from env and relaxes signup throttles in the playwright harness", async () => {
		const { config } = await loadAuthModule({
			playwrightHarness: true,
			env: {
				BETTER_AUTH_URL: "https://app.example.com",
				NEXT_PUBLIC_APP_URL: "https://public.example.com",
				VERCEL_URL: "preview.example.com",
				VERCEL_PROJECT_PRODUCTION_URL: "prod.example.com",
				NODE_ENV: "production",
			},
		});

		expect(config.baseURL.fallback).toBe("https://app.example.com");
		expect(config.baseURL.protocol).toBe("https");
		expect(config.baseURL.allowedHosts).toEqual(
			expect.arrayContaining([
				"127.0.0.1:3000",
				"app.example.com",
				"public.example.com",
				"preview.example.com",
				"prod.example.com",
			]),
		);
		expect(new Set(config.baseURL.allowedHosts).size).toBe(
			config.baseURL.allowedHosts.length,
		);
		expect(config.emailAndPassword.disableSignUp).toBe(false);
		expect(config.rateLimit.enabled).toBe(false);
		expect(config.advanced.useSecureCookies).toBe(true);
		expect(config.plugins).toEqual(["next-cookies-plugin"]);
	});
});
