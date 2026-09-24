import { expect, type Page } from "@playwright/test";

/** Picks a demo account on the mock login screen at "/". Each test gets a
 * fresh browser context (Playwright default), so the mock store always
 * starts from mockStore.ts's seed data — no cross-test bleed. */
export async function loginAsMock(page: Page, fullNameContains: string) {
  await page.goto("/");
  await page.getByText(fullNameContains, { exact: false }).first().click();
  await expect(page).toHaveURL(/\/calendar/);
}

export async function signOut(page: Page) {
  await page.goto("/profile");
  // Desktop viewport renders both the persistent Sidebar's sign-out button
  // and the Profile screen's own — scope to the main content one.
  await page.getByRole("main").getByRole("button", { name: "Çıkış yap" }).click();
  await expect(page).toHaveURL(/\/login/);
}
