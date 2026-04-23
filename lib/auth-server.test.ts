import { beforeEach, describe, expect, it, vi } from "vitest";

const { headers, redirect, getSession } = vi.hoisted(() => ({
	headers: vi.fn(),
	redirect: vi.fn(),
	getSession: vi.fn(),
}));

vi.mock("next/headers", () => ({
	headers,
}));

vi.mock("next/navigation", () => ({
	redirect,
}));

vi.mock("./auth", () => ({
	auth: {
		api: {
			getSession,
		},
	},
}));

async function loadAuthServer() {
	vi.resetModules();
	return import("./auth-server");
}

describe("auth-server", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		headers.mockResolvedValue(new Headers([["cookie", "session=1"]]));
	});

	it("loads the session using request headers", async () => {
		const session = { user: { id: "user-1" } };
		getSession.mockResolvedValue(session);
		const { getSession: loadSession } = await loadAuthServer();

		await expect(loadSession()).resolves.toEqual(session);
		expect(getSession).toHaveBeenCalledWith({
			headers: expect.any(Headers),
		});
	});

	it("redirects to login when a session is required but missing", async () => {
		getSession.mockResolvedValue(null);
		redirect.mockImplementation(() => {
			throw new Error("redirect:/login");
		});
		const { requireSession } = await loadAuthServer();

		await expect(requireSession()).rejects.toThrow("redirect:/login");
		expect(redirect).toHaveBeenCalledWith("/login");
	});

	it("returns the user id from the required session", async () => {
		getSession.mockResolvedValue({ user: { id: "user-42" } });
		const { requireUserId } = await loadAuthServer();

		await expect(requireUserId()).resolves.toBe("user-42");
	});
});
