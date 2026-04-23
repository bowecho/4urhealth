import { render, screen } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { AppNav, requireSession, redirect } = vi.hoisted(() => ({
	AppNav: vi.fn(() => <div data-testid="app-nav" />),
	requireSession: vi.fn(),
	redirect: vi.fn(),
}));

vi.mock("@/components/app-nav", () => ({
	AppNav,
}));

vi.mock("@/lib/auth-server", () => ({
	requireSession,
}));

vi.mock("next/navigation", () => ({
	redirect,
}));

describe("app layout", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the nav and children for onboarded users", async () => {
		requireSession.mockResolvedValue({
			user: { onboardedAt: "2026-04-22T00:00:00.000Z" },
		});
		const { default: AppLayout } = await import("@/app/(app)/layout");

		const result = await AppLayout({
			children: <div>App Child</div>,
		} as {
			children: React.ReactNode;
		});
		render(result);

		expect(screen.getByTestId("app-nav")).toBeInTheDocument();
		expect(screen.getByText("App Child")).toBeInTheDocument();
	});

	it("redirects non-onboarded users to onboarding", async () => {
		requireSession.mockResolvedValue({
			user: { onboardedAt: null },
		});
		const { default: AppLayout } = await import("@/app/(app)/layout");

		await AppLayout({
			children: <div>App Child</div>,
		} as {
			children: React.ReactNode;
		});

		expect(redirect).toHaveBeenCalledWith("/onboarding");
	});
});
