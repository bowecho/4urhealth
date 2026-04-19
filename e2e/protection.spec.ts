import { expect, test } from "@playwright/test";

test("protected routes redirect unauthenticated users to login", async ({
	page,
}) => {
	await page.goto("/settings");
	await expect(page).toHaveURL(/\/login\?next=%2Fsettings$/);
	await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
