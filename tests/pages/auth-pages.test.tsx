import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { LoginForm, SignupForm, isPlaywrightHarnessEnabled, redirect } =
	vi.hoisted(() => ({
		LoginForm: vi.fn(() => <div data-testid="login-form" />),
		SignupForm: vi.fn(() => <div data-testid="signup-form" />),
		isPlaywrightHarnessEnabled: vi.fn(),
		redirect: vi.fn(),
	}));

vi.mock("@/components/auth-forms", () => ({
	LoginForm,
	SignupForm,
}));

vi.mock("@/lib/runtime-flags", () => ({
	isPlaywrightHarnessEnabled,
}));

vi.mock("next/navigation", () => ({
	redirect,
}));

describe("auth pages", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the login page and shows the correct signup message", async () => {
		isPlaywrightHarnessEnabled.mockReturnValue(false);
		const { default: LoginPage } = await import("@/app/(auth)/login/page");

		render(<LoginPage />);

		expect(screen.getByTestId("login-form")).toBeInTheDocument();
		expect(
			screen.getByText("Account creation is disabled on this deployment."),
		).toBeInTheDocument();
	});

	it("renders the local signup page only in the playwright harness", async () => {
		isPlaywrightHarnessEnabled.mockReturnValue(true);
		const { default: SignupPage } = await import("@/app/(auth)/signup/page");

		render(<SignupPage />);

		expect(screen.getByTestId("signup-form")).toBeInTheDocument();
		expect(
			screen.getByText(
				"Local-only signup is enabled for Playwright verification.",
			),
		).toBeInTheDocument();
	});

	it("redirects signup to login outside the harness", async () => {
		isPlaywrightHarnessEnabled.mockReturnValue(false);
		const { default: SignupPage } = await import("@/app/(auth)/signup/page");

		SignupPage();

		expect(redirect).toHaveBeenCalledWith("/login");
	});

	it("renders the auth layout marketing and children", async () => {
		const { default: AuthLayout } = await import("@/app/(auth)/layout");

		render(
			<AuthLayout>
				<div>Auth Child</div>
			</AuthLayout>,
		);

		expect(screen.getAllByText("4urhealth")).toHaveLength(2);
		expect(
			screen.getByText(
				"A quiet place to track food, weight, and patterns that matter.",
			),
		).toBeInTheDocument();
		expect(screen.getByText("Auth Child")).toBeInTheDocument();
	});
});
