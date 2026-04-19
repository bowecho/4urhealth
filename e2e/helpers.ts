import { type APIRequestContext, expect, type Page } from "@playwright/test";

export type TestCredentials = {
	name: string;
	email: string;
	password: string;
};

export function makeTestCredentials(): TestCredentials {
	const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
	return {
		name: "Playwright Tester",
		email: `playwright+${nonce}@example.com`,
		password: "playwright-pass-123",
	};
}

export async function cleanupTestUser(
	request: APIRequestContext,
	email: string,
) {
	await request.delete("/api/e2e/test-user", {
		data: { email },
	});
}

export async function signIn(
	page: Page,
	credentials: TestCredentials,
	loginPath = "/login",
) {
	await page.goto(loginPath);
	await page.getByLabel("Email").fill(credentials.email);
	await page.getByLabel("Password").fill(credentials.password);
	await page.getByRole("button", { name: "Sign in" }).click();
	await expect(page).toHaveURL(/\/($|onboarding)/);
}

export async function signUpAndOnboard(
	page: Page,
	credentials: TestCredentials,
) {
	await page.goto("/signup");
	await page.getByLabel("Name").fill(credentials.name);
	await page.getByLabel("Email").fill(credentials.email);
	await page.getByLabel("Password").fill(credentials.password);
	await page.getByRole("button", { name: "Create account" }).click();

	await expect(page).toHaveURL(/\/onboarding$/, { timeout: 15000 });
	await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible({
		timeout: 15000,
	});
	await page.getByLabel("Date of birth").fill("1990-04-19");
	await page.getByLabel("Current weight (lbs)").fill("210");
	await page.getByRole("button", { name: "Calculate my plan" }).click();
	await page.getByRole("button", { name: "Save and get started" }).click();

	await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
}
