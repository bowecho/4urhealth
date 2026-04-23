import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm, SignupForm } from "@/components/auth-forms";

const { push, refresh, getParam, signInEmail, signUpEmail } = vi.hoisted(
	() => ({
		push: vi.fn(),
		refresh: vi.fn(),
		getParam: vi.fn(),
		signInEmail: vi.fn(),
		signUpEmail: vi.fn(),
	}),
);

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push, refresh }),
	useSearchParams: () => ({ get: getParam }),
}));

vi.mock("@/lib/auth-client", () => ({
	signIn: { email: signInEmail },
	signUp: { email: signUpEmail },
}));

describe("LoginForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getParam.mockReturnValue(null);
		signInEmail.mockResolvedValue({ error: null });
	});

	it("signs in and pushes a safe next path", async () => {
		getParam.mockReturnValue("/day/2026-04-22");
		render(<LoginForm />);

		fireEvent.change(screen.getByLabelText("Email"), {
			target: { value: "user@example.com" },
		});
		fireEvent.change(screen.getByLabelText("Password"), {
			target: { value: "supersecret123" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

		await waitFor(() =>
			expect(signInEmail).toHaveBeenCalledWith({
				email: "user@example.com",
				password: "supersecret123",
			}),
		);
		await waitFor(() => expect(push).toHaveBeenCalledWith("/day/2026-04-22"));
		expect(refresh).toHaveBeenCalled();
	});

	it.each([
		[null, "/"],
		["https://evil.example", "/"],
		["//evil.example", "/"],
	])("falls back to / for next=%p", async (next, expected) => {
		getParam.mockReturnValue(next);
		render(<LoginForm />);

		fireEvent.change(screen.getByLabelText("Email"), {
			target: { value: "user@example.com" },
		});
		fireEvent.change(screen.getByLabelText("Password"), {
			target: { value: "supersecret123" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

		await waitFor(() => expect(push).toHaveBeenCalledWith(expected));
	});

	it("shows provider errors without navigating", async () => {
		signInEmail.mockResolvedValueOnce({
			error: { message: "Invalid email or password" },
		});
		render(<LoginForm />);

		fireEvent.change(screen.getByLabelText("Email"), {
			target: { value: "user@example.com" },
		});
		fireEvent.change(screen.getByLabelText("Password"), {
			target: { value: "wrongpassword" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

		expect(
			await screen.findByText("Invalid email or password"),
		).toBeInTheDocument();
		expect(push).not.toHaveBeenCalled();
	});
});

describe("SignupForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		signUpEmail.mockResolvedValue({ error: null });
	});

	it("blocks short passwords before calling the auth client", async () => {
		render(<SignupForm />);

		fireEvent.change(screen.getByLabelText("Name"), {
			target: { value: "New User" },
		});
		fireEvent.change(screen.getByLabelText("Email"), {
			target: { value: "new@example.com" },
		});
		fireEvent.change(screen.getByLabelText("Password"), {
			target: { value: "short" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Create account" }));

		expect(
			await screen.findByText("Password must be at least 10 characters"),
		).toBeInTheDocument();
		expect(signUpEmail).not.toHaveBeenCalled();
	});

	it("shows provider errors without navigating", async () => {
		signUpEmail.mockResolvedValueOnce({
			error: { message: "Account already exists" },
		});
		render(<SignupForm />);

		fireEvent.change(screen.getByLabelText("Name"), {
			target: { value: "New User" },
		});
		fireEvent.change(screen.getByLabelText("Email"), {
			target: { value: "new@example.com" },
		});
		fireEvent.change(screen.getByLabelText("Password"), {
			target: { value: "supersecret123" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Create account" }));

		expect(
			await screen.findByText("Account already exists"),
		).toBeInTheDocument();
		expect(push).not.toHaveBeenCalled();
	});

	it("creates an account and redirects to onboarding", async () => {
		render(<SignupForm />);

		fireEvent.change(screen.getByLabelText("Name"), {
			target: { value: "New User" },
		});
		fireEvent.change(screen.getByLabelText("Email"), {
			target: { value: "new@example.com" },
		});
		fireEvent.change(screen.getByLabelText("Password"), {
			target: { value: "supersecret123" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Create account" }));

		await waitFor(() =>
			expect(signUpEmail).toHaveBeenCalledWith({
				name: "New User",
				email: "new@example.com",
				password: "supersecret123",
			}),
		);
		await waitFor(() => expect(push).toHaveBeenCalledWith("/onboarding"));
		expect(refresh).toHaveBeenCalled();
	});
});
