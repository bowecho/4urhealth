import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ServiceWorkerRegister } from "@/components/service-worker-register";

const initialEnv = process.env.NODE_ENV;
const mutableEnv = process.env as Record<string, string | undefined>;

function setNodeEnv(value: string | undefined) {
	mutableEnv.NODE_ENV = value;
}

describe("ServiceWorkerRegister", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	afterEach(() => {
		setNodeEnv(initialEnv);
	});

	it("does nothing outside production", () => {
		setNodeEnv("development");
		const register = vi.fn();
		Object.defineProperty(global.navigator, "serviceWorker", {
			configurable: true,
			value: { register },
		});

		render(<ServiceWorkerRegister />);

		expect(register).not.toHaveBeenCalled();
	});

	it("registers the service worker in production when supported", async () => {
		setNodeEnv("production");
		const register = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(global.navigator, "serviceWorker", {
			configurable: true,
			value: { register },
		});

		render(<ServiceWorkerRegister />);

		await waitFor(() =>
			expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/" }),
		);
	});
});
