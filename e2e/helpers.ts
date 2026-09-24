import { expect, type Page } from "@playwright/test";

// mockStore.ts seeds fixture sessions at fixed times "today" (e.g. 09:00),
// computed from a live `new Date()` the moment the app first loads. Whether
// those land in the past or the future — and therefore whether they count
// toward commission at all — would otherwise depend on what wall-clock hour
// happens to be real right now wherever the suite runs (fine most of the
// day on a dev machine, but flaky/broken outright on a CI runner that could
// execute at any UTC hour). Pin the clock before that first load so every
// run sees the exact same "now", independent of when it actually runs.
const FIXED_NOW = new Date("2025-06-15T18:00:00.000Z");

/** Picks a demo account on the mock login screen at "/". Each test gets a
 * fresh browser context (Playwright default), so the mock store always
 * starts from mockStore.ts's seed data — no cross-test bleed. */
export async function loginAsMock(page: Page, fullNameContains: string) {
  await page.clock.setFixedTime(FIXED_NOW);
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
