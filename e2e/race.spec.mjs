import { test, expect, devices } from "@playwright/test";

// แถวในตารางการใช้รถ (หน้ารถมีตารางเติมน้ำมันอยู่ด้วย)
const TRIP_ROWS = '[data-table="trips"] tbody tr';

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const img = (name) => ({ name: `${name}.png`, mimeType: "image/png", buffer: PNG });

async function phones(browser, n, code) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const ctx = await browser.newContext({ ...devices["Pixel 7"] });
    const page = await ctx.newPage();
    await page.goto(`/v/${code}`);
    list.push({ ctx, page });
  }
  return list;
}

async function submitAll(list, button) {
  await Promise.all(list.map(({ page }) => page.getByRole("button", { name: button }).click()));
  await Promise.all(list.map(({ page }) => page.waitForLoadState("networkidle")));
  await new Promise((r) => setTimeout(r, 1500));
}

// 6 เครื่องกดบันทึกออกเดินทางรถคันเดียวกันพร้อมกัน → สำเร็จได้เครื่องเดียว ที่เหลือได้ข้อความให้รีเฟรช
test("six phones racing to start the same car", async ({ browser }) => {
  const list = await phones(browser, 6, "v4");
  for (const [i, { page }] of list.entries()) {
    await page.fill('input[name="employeeCode"]', "E100");
    await page.fill('input[name="destination"]', `race ${i}`);
    await page.fill('input[name="mileageStart"]', "700");
    await page.setInputFiles('input[name="selfie"]', img("s"));
    await page.setInputFiles('input[name="photo"]', img("p"));
  }
  await submitAll(list, "บันทึกออกเดินทาง");
  const ok = list.filter(({ page }) => /done\?t=start/.test(page.url())).length;
  const refused = [];
  for (const { page } of list) {
    if (!/done/.test(page.url())) refused.push(await page.getByText(/กรุณารีเฟรชหน้า/).isVisible());
  }
  for (const { ctx } of list) await ctx.close();
  console.log("start race — success pages:", ok);
  expect(ok).toBe(1);
  expect(refused.every(Boolean), "losing phones show a refresh message").toBe(true);
});

// 4 เครื่องคืนรถคันเดียวกันพร้อมกัน (เลขไมล์ต่างกัน) → บันทึกได้ครั้งเดียว ไม่เขียนทับกัน
test("four phones racing to return the same car", async ({ browser }) => {
  const list = await phones(browser, 4, "v4");
  for (const [i, { page }] of list.entries()) {
    await page.fill('input[name="mileageEnd"]', String(710 + i));
    await page.setInputFiles('input[name="photo"]', img("e"));
  }
  await submitAll(list, "บันทึกคืนรถ");
  const done = list.filter(({ page }) => /done\?t=end/.test(page.url()));
  const km = done.map(({ page }) => new URL(page.url()).searchParams.get("km"));
  for (const { ctx } of list) await ctx.close();
  console.log("return race — success pages:", done.length);
  expect(done.length).toBe(1);

  // เลขไมล์ที่เก็บต้องตรงกับเครื่องที่ได้หน้าสำเร็จ
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/admin/login");
  await page.fill('input[name="password"]', process.env.ADMIN_PW);
  await page.click("button");
  await page.waitForURL(/\/admin$/);
  await page.goto("/admin/vehicles/v4");
  await expect(page.locator(TRIP_ROWS)).toHaveCount(1);
  await expect(page.locator(`${TRIP_ROWS} td`).nth(9)).toHaveText(km[0]);
  await ctx.close();
});
