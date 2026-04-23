import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "@/app/api/e2e/test-user/route";

const { isPlaywrightHarnessEnabled, db } = vi.hoisted(() => ({
	isPlaywrightHarnessEnabled: vi.fn(),
	db: {
		select: vi.fn(),
		transaction: vi.fn(),
	},
}));

vi.mock("@/lib/runtime-flags", () => ({
	isPlaywrightHarnessEnabled,
}));

vi.mock("@/db", () => ({
	db,
}));

function makeRequest(body: unknown) {
	return new Request("https://4urhealth.vercel.app/api/e2e/test-user", {
		method: "DELETE",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("e2e test-user cleanup route", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 404 when the playwright harness is disabled", async () => {
		isPlaywrightHarnessEnabled.mockReturnValue(false);

		const response = await DELETE(
			makeRequest({ email: "playwright+x@example.com" }),
		);

		expect(response.status).toBe(404);
	});

	it("rejects non-playwright emails", async () => {
		isPlaywrightHarnessEnabled.mockReturnValue(true);

		const response = await DELETE(makeRequest({ email: "user@example.com" }));

		expect(response.status).toBe(400);
	});

	it("returns ok when the user does not exist", async () => {
		isPlaywrightHarnessEnabled.mockReturnValue(true);
		const limit = vi.fn().mockResolvedValue([]);
		const where = vi.fn(() => ({ limit }));
		const from = vi.fn(() => ({ where }));
		db.select.mockReturnValue({ from });

		const response = await DELETE(
			makeRequest({ email: "playwright+missing@example.com" }),
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it("deletes saved meal items before deleting the user", async () => {
		isPlaywrightHarnessEnabled.mockReturnValue(true);
		const limit = vi.fn().mockResolvedValue([{ id: "user-1" }]);
		const where = vi.fn(() => ({ limit }));
		const from = vi.fn(() => ({ where }));
		db.select.mockReturnValue({ from });

		const txWhereDelete = vi.fn().mockResolvedValue(undefined);
		const txDelete = vi.fn(() => ({ where: txWhereDelete }));
		const txMealWhere = vi.fn().mockResolvedValue([{ id: "meal-1" }]);
		const txMealFrom = vi.fn(() => ({ where: txMealWhere }));
		const txSelect = vi.fn(() => ({ from: txMealFrom }));
		db.transaction.mockImplementation(async (run) =>
			run({
				select: txSelect,
				delete: txDelete,
			}),
		);

		const response = await DELETE(
			makeRequest({ email: "playwright+cleanup@example.com" }),
		);

		expect(response.status).toBe(200);
		expect(txDelete).toHaveBeenCalledTimes(2);
		expect(txWhereDelete).toHaveBeenCalledTimes(2);
	});
});
