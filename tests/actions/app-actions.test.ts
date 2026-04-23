import { describe, expect, it, vi } from "vitest";

const { headers, redirect, signOut } = vi.hoisted(() => ({
	headers: vi.fn(),
	redirect: vi.fn(),
	signOut: vi.fn(),
}));

vi.mock("next/headers", () => ({
	headers,
}));

vi.mock("next/navigation", () => ({
	redirect,
}));

vi.mock("@/lib/auth", () => ({
	auth: {
		api: {
			signOut,
		},
	},
}));

describe("app actions", () => {
	it("signs out with request headers and redirects to login", async () => {
		headers.mockResolvedValue(new Headers([["cookie", "session=1"]]));
		const { signOutAction } = await import("@/app/(app)/actions");

		await signOutAction();

		expect(signOut).toHaveBeenCalledWith({
			headers: expect.any(Headers),
		});
		expect(redirect).toHaveBeenCalledWith("/login");
	});
});
