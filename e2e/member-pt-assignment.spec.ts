import { expect, test } from "@playwright/test";
import { loginAsMock } from "./helpers";

test("PT seçilmeden üye eklenemez, seçilince eklenir ve listede PT adıyla görünür", async ({ page }) => {
  await loginAsMock(page, "Ayşe Sport");
  await page.goto("/uyeler");

  await page.getByText("Üye ekle", { exact: false }).click();
  const nameInput = page.locator('label:text("Ad Soyad") + input');
  await nameInput.fill("E2E Test Üye");

  // PT seçmeden kaydetmeye çalış — engellenmeli
  await page.getByRole("button", { name: "Üyeyi ekle" }).click();
  await expect(page.getByText("PT'si seçilmeli", { exact: false })).toBeVisible();

  // PT seçip tekrar dene — başarılı olmalı
  const ptSelect = page.locator('label:text("PT") + select');
  await ptSelect.selectOption({ label: "Deniz Aksoy" });
  await page.getByRole("button", { name: "Üyeyi ekle" }).click();

  await expect(page.getByText("E2E Test Üye", { exact: false })).toBeVisible();
  const row = page.locator("button", { hasText: "E2E Test Üye" });
  await expect(row).toContainText("Deniz Aksoy");
});
