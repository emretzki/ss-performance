import { expect, test } from "@playwright/test";
import { gotoPinned, loginAsMock, signOut } from "./helpers";

// Fixture math this test relies on (src/lib/mockStore.ts, untouched by this
// test): trainer t1 (Emre Korkmaz) has today's 09:00 session s1 against
// member m1 (Kerem Uslu), whose package prices at 6400/8 = 800 TL/ders.
// Trainer t3 (Cem Yıldız) has a 50% commission rate and, before the
// handoff, zero commission-eligible sessions (his only existing session has
// no member attached). After the handoff: 1 ders, 800 TL ortalama, 400 TL prim.
test("bir PT kendi dersini bir meslektaşına devredebilir, prim devralana yazılır", async ({ page }) => {
  await loginAsMock(page, "Emre Korkmaz");
  await gotoPinned(page, "/takvim");
  await page.getByText("Dolu", { exact: false }).click();

  await expect(page.getByText("Dersi devret", { exact: false })).toBeVisible();
  const handoffSelect = page.locator('div:has-text("Dersi devret") select');
  await handoffSelect.selectOption({ label: "Cem Yıldız" });
  await page.getByRole("button", { name: "Devret" }).click();
  await expect(page.getByRole("button", { name: "Devret" })).not.toBeVisible();

  await signOut(page);
  await loginAsMock(page, "Ayşe Sport");
  await gotoPinned(page, "/team");
  await page.getByText("PT'ler", { exact: false }).click();
  await page.getByText("Cem Yıldız", { exact: false }).first().click();

  await expect(page).toHaveURL(/\/team\//);
  await expect(page.getByText("Verdiği ders")).toBeVisible();
  const card = page.locator("section", { hasText: "Verdiği ders" });
  await expect(card).toContainText("400 TL");
  await expect(card.getByText("1", { exact: true })).toBeVisible();
  await expect(card).toContainText("800 TL");
});
