import { expect, type Page } from "@playwright/test";

// mockStore.ts seeds fixture sessions at fixed times "today" (e.g. 09:00),
// computed from a live `new Date()` the moment the app first loads. Whether
// those land in the past or the future — and therefore whether they count
// toward commission at all — would otherwise depend on what wall-clock hour
// happens to be real right now wherever the suite runs (fine most of the
// day on a dev machine, but flaky/broken outright on a CI runner that could
// execute at any UTC hour). Pin the clock before that first load so every
// run sees the exact same "now", independent of when it actually runs.
//
// 06:15 UTC = 09:15 in the pinned Europe/Istanbul timezone (see
// playwright.config.ts) — 15 minutes into the fixture's 09:00-local
// sessions. Safely in the past for commission (which only excludes
// cancelled/future sessions), but still mid-session for status purposes, so
// every fixture session at 09:00 (including the 30-minute one, ending
// 09:30) still displays as "in_progress" — occupying its slot ("Dolu" at
// capacity 3) — rather than already auto-completed by displayStatus()'s
// duration-based done check (see auto_progress_sessions()/migration 0020).
const FIXED_NOW = new Date("2025-06-15T06:15:00.000Z");

// page.goto() here is a full document navigation/reload (this SPA's dev
// server serves a fresh index.html + JS bundle per URL, not a client-side
// route push), and that resets Playwright's pinned clock back to the real
// wall clock each time — so every navigation has to re-pin it, not just the
// first one in loginAsMock, or a session booked/read after any later goto()
// silently uses the real current date again (year+ away from the fixture's
// pinned "today", making every fixture session look ancient).
export async function gotoPinned(page: Page, url: string) {
  await page.clock.setFixedTime(FIXED_NOW);
  await page.goto(url);
}

/** Picks a demo account on the mock login screen at "/". Each test gets a
 * fresh browser context (Playwright default), so the mock store always
 * starts from mockStore.ts's seed data — no cross-test bleed. */
export async function loginAsMock(page: Page, fullNameContains: string) {
  await gotoPinned(page, "/");
  await page.getByText(fullNameContains, { exact: false }).first().click();
  await expect(page).toHaveURL(/\/calendar/);
}

export async function signOut(page: Page) {
  await gotoPinned(page, "/profile");
  // Desktop viewport renders both the persistent Sidebar's sign-out button
  // and the Profile screen's own — scope to the main content one.
  await page.getByRole("main").getByRole("button", { name: "Çıkış yap" }).click();
  await expect(page).toHaveURL(/\/login/);
}
