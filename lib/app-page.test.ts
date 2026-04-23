import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAppPageContext } from "./app-page";

const { requireSession, todayInTz } = vi.hoisted(() => ({
	requireSession: vi.fn(),
	todayInTz: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth-server", () => ({
	requireSession,
}));

vi.mock("@/lib/date", () => ({
	todayInTz,
}));

describe("requireAppPageContext", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns session, user id, timezone, and today", async () => {
		const session = {
			user: {
				id: "user-1",
				timezone: "America/Chicago",
			},
		};
		requireSession.mockResolvedValue(session);
		todayInTz.mockReturnValue("2026-04-22");

		await expect(requireAppPageContext()).resolves.toEqual({
			session,
			userId: "user-1",
			timezone: "America/Chicago",
			today: "2026-04-22",
		});
		expect(todayInTz).toHaveBeenCalledWith("America/Chicago");
	});

	it("falls back to UTC when the user has no timezone", async () => {
		requireSession.mockResolvedValue({
			user: { id: "user-2", timezone: null },
		});
		todayInTz.mockReturnValue("2026-04-22");

		await requireAppPageContext();

		expect(todayInTz).toHaveBeenCalledWith("UTC");
	});
});
