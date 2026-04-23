import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirect, requireSession } = vi.hoisted(() => ({
	redirect: vi.fn((to: string) => {
		throw new Error(`redirect:${to}`);
	}),
	requireSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	redirect,
}));

vi.mock("@/lib/auth-server", () => ({
	requireSession,
}));

vi.mock("@/components/onboarding-form", () => ({
	OnboardingForm: () => <div data-testid="onboarding-form" />,
}));

describe("onboarding page", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("redirects onboarded users home", async () => {
		requireSession.mockResolvedValue({
			user: { name: "Tony", onboardedAt: "2026-04-22T00:00:00.000Z" },
		});
		const { default: OnboardingPage } = await import("@/app/onboarding/page");

		await expect(OnboardingPage()).rejects.toThrow("redirect:/");
		expect(redirect).toHaveBeenCalledWith("/");
	});

	it("renders the onboarding form for new users", async () => {
		requireSession.mockResolvedValue({
			user: { name: "Tony", onboardedAt: null },
		});
		const { default: OnboardingPage } = await import("@/app/onboarding/page");

		const page = await OnboardingPage();

		expect(page.props.children[0].props.children.join("")).toContain(
			"Welcome, Tony",
		);
		expect(page.props.children[2].type).toBeDefined();
	});
});
