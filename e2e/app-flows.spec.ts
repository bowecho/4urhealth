import { expect, test } from "@playwright/test";
import {
	cleanupTestUser,
	makeTestCredentials,
	signIn,
	signUpAndOnboard,
} from "./helpers";

test.describe
	.serial("authenticated app flows", () => {
		test.skip(
			({ isMobile }) => isMobile,
			"Full auth CRUD flow is desktop-only.",
		);

		const credentials = makeTestCredentials();

		test.afterAll(async ({ baseURL, playwright }) => {
			const request = await playwright.request.newContext({ baseURL });
			await cleanupTestUser(request, credentials.email);
			await request.dispose();
		});

		test("user can onboard and keep a saved light theme across sessions", async ({
			page,
		}) => {
			await signUpAndOnboard(page, credentials);

			await page.getByRole("link", { name: "Settings" }).click();
			await expect(
				page.getByRole("heading", { name: "Settings" }),
			).toBeVisible();
			await page.getByRole("button", { name: "Light" }).click();
			await page.getByRole("button", { name: "Save profile" }).click();
			await expect(page.getByText("Saved.")).toBeVisible();
			await expect(page.locator("html")).toHaveAttribute(
				"data-theme-preference",
				"light",
			);

			await page.getByRole("button", { name: "Sign out" }).click();
			await expect(page).toHaveURL(/\/login$/);

			await signIn(page, credentials, "/login?next=javascript:alert(1)");
			await expect(page).toHaveURL("/");
			await expect(page.locator("html")).toHaveAttribute(
				"data-theme-preference",
				"light",
			);
		});

		test("user can create foods, save a meal, and log it", async ({ page }) => {
			await signIn(page, credentials);

			await page.getByRole("link", { name: "Foods" }).click();
			await page.getByRole("button", { name: "+ New food" }).click();
			await page.getByLabel("Name").fill("Greek Yogurt");
			await page.getByLabel("Brand (optional)").fill("Fage");
			await page.getByLabel("Serving size").fill("1");
			await page.getByLabel("Unit").fill("container");
			await page.getByLabel("Calories per serving").fill("130");
			await page.getByLabel("Protein (g)").fill("23");
			await page.getByLabel("Fat (g)").fill("0");
			await page.getByLabel("Carbs (g)").fill("9");
			await page.getByRole("button", { name: "Save", exact: true }).click();
			await expect(page.getByText("Greek Yogurt")).toBeVisible();

			await page.getByRole("link", { name: "Meals" }).click();
			await page.getByRole("button", { name: "+ New saved meal" }).click();
			await page.getByLabel("Name").fill("Breakfast Bowl");
			await page.getByPlaceholder("Search foods…").fill("Greek");
			await page.getByRole("button", { name: /Greek Yogurt/ }).click();
			await page.getByRole("button", { name: "Save", exact: true }).click();
			await expect(page.getByText("Breakfast Bowl")).toBeVisible();

			await page.getByRole("button", { name: "Log" }).click();
			await page.getByLabel("Meal").selectOption("breakfast");
			await page.getByRole("button", { name: "Log it" }).click();

			await page.getByRole("link", { name: "Today" }).click();
			await expect(page.getByText("Greek Yogurt")).toBeVisible();
			await expect(page.getByText(/130 cal/)).toBeVisible();
		});

		test("user can log weight and see it reflected in stats", async ({
			page,
		}) => {
			await signIn(page, credentials);

			await page.getByRole("link", { name: "Weight" }).click();
			await expect(page.getByRole("heading", { name: "Weight" })).toBeVisible();
			await page.getByLabel("Weight (lb)").fill("204.2");
			await page.getByRole("button", { name: "Save" }).click();
			await expect(page.getByText("204.2 lb").first()).toBeVisible();

			await page.getByRole("link", { name: "Stats" }).click();
			await expect(page.getByRole("heading", { name: "Stats" })).toBeVisible();
			await expect(page.getByText("Days logged")).toBeVisible();
			const weightSection = page.locator("section").filter({
				hasText: "Weight change",
			});
			await expect(weightSection).toContainText("204.2");
		});
	});
