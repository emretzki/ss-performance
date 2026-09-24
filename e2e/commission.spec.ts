import { expect, test } from "@playwright/test";
import { loginAsMock, signOut } from "./helpers";

async function readDenizStats(page: import("@playwright/test").Page) {
  await page.goto("/team");
  await page.getByText("PT'ler", { exact: false }).click();
  await page.getByText("Deniz Aksoy", { exact: false }).first().click();
  await expect(page).toHaveURL(/\/team\//);
  // Scoped to the money card (not the whole page): its period label ("1 Eyl
  // – 30 Eyl") also contains digits, which would otherwise confuse a
  // whole-body regex looking for the commission figure.
  const card = page.locator("section", { hasText: "Verdiği ders" });
  const text = (await card.textContent()) ?? "";
  const sessionCount = Number(text.match(/Verdiği ders(\d+)/)?.[1] ?? "0");
  // First "<digits> TL" in the card is the big commission figure — it's
  // rendered before "Verdiği ders"/"Ortalama ders ücreti", which each have
  // their own further down (match() with no /g/ returns the leftmost one).
  const commission = Number((text.match(/(\d[\d.]*) TL/)?.[1] ?? "0").replace(/\./g, ""));
  return { sessionCount, commission };
}

test("bir üyeye ders girilince, o dersin priminin doğru PT'ye yansıdığı Raporlar/PT profilinde görünür", async ({ page }) => {
  // 1) Owner: paketli, Deniz Aksoy'a atanmış yeni bir üye oluştur.
  await loginAsMock(page, "Ayşe Sport");
  await page.goto("/uyeler");
  await page.getByText("Üye ekle", { exact: false }).click();
  await page.locator('label:text("Ad Soyad") + input').fill("E2E Prim Üyesi");
  await page.locator('label:text("PT") + select').selectOption({ label: "Deniz Aksoy" });
  await page.locator('input[placeholder="Örn. 8 Ders Paketi"]').fill("Test Paket");
  const [priceInput, sessionsInput] = await page.locator('input[type="number"]').all();
  await priceInput.fill("4000");
  await sessionsInput.fill("10"); // birim fiyat: 400 TL/ders
  await page.getByRole("button", { name: "Üyeyi ekle" }).click();
  await expect(page.getByText("E2E Prim Üyesi", { exact: false })).toBeVisible();

  const before = await readDenizStats(page);

  // 2) Deniz Aksoy olarak bu üyeye bugün, boş bir saatte ders gir.
  await signOut(page);
  await loginAsMock(page, "Deniz Aksoy");
  await page.goto("/takvim");
  await page.getByLabel("Ders eklemek için dokun").first().click();
  await page.getByPlaceholder("İsimle ara").fill("E2E Prim Üyesi");
  await page.getByText("E2E Prim Üyesi", { exact: false }).last().click();
  await page.getByRole("button", { name: "Dersi Ekle" }).click();
  await expect(page.getByRole("button", { name: "Dersi Ekle" })).not.toBeVisible();

  // 3) Owner: Deniz'in profilinde tam olarak 1 ders / 200 TL prim (400 * %50) artış olmalı.
  await signOut(page);
  await loginAsMock(page, "Ayşe Sport");
  const after = await readDenizStats(page);

  expect(after.sessionCount).toBe(before.sessionCount + 1);
  expect(after.commission).toBe(before.commission + 200);
});
