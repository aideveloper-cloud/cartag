import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

async function adminLogin(page) {
  await page.goto("/admin/login");
  await page.fill('input[name="password"]', process.env.ADMIN_PW);
  await page.click("button");
  await page.waitForURL(/\/admin$/);
}

const row = (page, code) => page.locator("tbody tr", { has: page.getByText(code, { exact: true }) });

test("vehicles page lists seeded cars in order", async ({ page }) => {
  await adminLogin(page);
  await page.getByRole("link", { name: "รถ", exact: true }).click();
  await expect(page.getByRole("heading", { name: "รถ (5 คัน)" })).toBeVisible();
  await expect(page.locator("tbody tr td:first-child")).toHaveText(["v1", "v2", "v3", "v4", "v5"]);
});

test("admin adds a car: plate is tidied and gets the next QR code", async ({ page, request }) => {
  await adminLogin(page);
  await page.goto("/admin/vehicles");
  await page.fill('input[placeholder^="ทะเบียนรถ"]', "  9 กก   9999 ");
  await page.getByRole("button", { name: "เพิ่มรถ" }).click();
  await expect(page.getByText("เพิ่ม 9 กก 9999 แล้ว (รหัส QR v6)")).toBeVisible();
  await expect(row(page, "v6").locator('input[name="plate"]')).toHaveValue("9 กก 9999");

  await page.fill('input[placeholder^="ทะเบียนรถ"]', "9 กก 9999");
  await page.getByRole("button", { name: "เพิ่มรถ" }).click();
  await expect(page.getByText("ทะเบียน 9 กก 9999 มีอยู่แล้ว")).toBeVisible();

  // ขึ้นในหน้าหลัก (ท้ายสุด), หน้า QR และหน้าสแกนได้ทันที
  await page.goto("/admin");
  await expect(page.locator('main a[href^="/admin/vehicles/v"]').last()).toContainText("9 กก 9999");
  await page.goto("/admin/qr");
  await expect(page.locator("main svg")).toHaveCount(12); // 6 คัน × (ใช้รถ + เติมน้ำมัน)
  const scan = await request.get("/v/v6");
  expect(scan.status()).toBe(200);
  expect(await scan.text()).toContain("9 กก 9999");
});

test("admin renames a car; duplicate plate is refused", async ({ page, request }) => {
  await adminLogin(page);
  await page.goto("/admin/vehicles");
  await row(page, "v6").locator('input[name="plate"]').fill("9 กข 1111");
  await row(page, "v6").getByRole("button", { name: "บันทึก" }).click();
  await expect(row(page, "v6").getByText("บันทึกแล้ว")).toBeVisible();
  expect(await (await request.get("/v/v6")).text()).toContain("9 กข 1111");

  await row(page, "v6").locator('input[name="plate"]').fill("2 ฒพ 2523");
  await row(page, "v6").getByRole("button", { name: "บันทึก" }).click();
  await expect(row(page, "v6").getByText("ทะเบียน 2 ฒพ 2523 มีอยู่แล้ว")).toBeVisible();
});

test("a car with trips cannot be deleted", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/vehicles");
  page.on("dialog", (d) => d.accept());
  await row(page, "v1").getByRole("button", { name: "ลบ" }).click();
  await expect(row(page, "v1").getByText(/ลบไม่ได้ — รถคันนี้มีประวัติการใช้ \d+ รายการ/)).toBeVisible();
  await page.reload();
  await expect(row(page, "v1")).toHaveCount(1);
});

test("an unused car can be deleted and its code is not reused", async ({ page, request }) => {
  await adminLogin(page);
  await page.goto("/admin/vehicles");
  page.on("dialog", (d) => d.accept());
  await row(page, "v6").getByRole("button", { name: "ลบ" }).click();
  await expect(row(page, "v6")).toHaveCount(0);
  expect((await request.get("/v/v6")).status()).toBe(404);

  await page.fill('input[placeholder^="ทะเบียนรถ"]', "7 ขข 7777");
  await page.getByRole("button", { name: "เพิ่มรถ" }).click();
  await expect(page.getByText("เพิ่ม 7 ขข 7777 แล้ว (รหัส QR v7)")).toBeVisible();
});

test("vehicle actions require login", async ({ page }) => {
  await page.goto("/admin/vehicles");
  await expect(page).toHaveURL(/\/admin\/login$/);
});
