// รถภายในบริษัท: แท็บประเภทรถ, กลุ่มรถ, QR เติมน้ำมัน, รีพอร์ตหลายคัน
// ชื่อขึ้นต้น z- ให้รันเป็นไฟล์สุดท้าย (หลัง vehicles.spec ที่คาดรหัส v6/v7) — ใช้รหัสรถที่ได้จากข้อความ "เพิ่ม ... แล้ว (รหัส QR vN)"
import { test, expect, devices } from "@playwright/test";
import ExcelJS from "exceljs";

test.describe.configure({ mode: "serial" });

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const img = (name) => ({ name: `${name}.png`, mimeType: "image/png", buffer: PNG });

async function adminLogin(page) {
  await page.goto("/admin/login");
  await page.fill('input[name="password"]', process.env.ADMIN_PW);
  await page.click("button");
  await page.waitForURL(/\/admin$/);
}

let pool; // รหัสรถส่วนกลางที่เพิ่มในเทสนี้

test("admin adds internal cars into groups; tabs keep categories apart", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/employees");
  await page.fill('input[placeholder="รหัสพนักงาน"]', "E900");
  await page.fill('input[placeholder="ชื่อ-นามสกุล"]', "คนขับ ภายใน");
  await page.fill('input[placeholder="แผนก"]', "ส่วนกลาง");
  await page.getByRole("button", { name: "เพิ่ม", exact: true }).click();
  await expect(page.getByText("เพิ่ม คนขับ ภายใน แล้ว")).toBeVisible();

  await page.goto("/admin/vehicles?type=internal");
  await expect(page.getByRole("heading", { name: "รถ (0 คัน)" })).toBeVisible();
  const select = page.locator('form select[name="groupId"]').first();
  await expect(select).toHaveValue("g_pool");
  await page.fill('input[placeholder^="ทะเบียนรถ"]', "1 ภน 1001");
  await page.getByRole("button", { name: "เพิ่มรถ" }).click();
  pool = (await page.getByText(/เพิ่ม 1 ภน 1001 แล้ว/).textContent()).match(/รหัส QR (v\d+)/)[1];
  await page.fill('input[placeholder^="ทะเบียนรถ"]', "1 ภน 2001");
  await select.selectOption("g_service");
  await page.getByRole("button", { name: "เพิ่มรถ" }).click();
  await expect(page.getByText(/เพิ่ม 1 ภน 2001 แล้ว/)).toBeVisible();

  await page.goto("/admin?type=internal");
  await expect(page.getByText("กลุ่มส่วนกลาง (1)")).toBeVisible();
  await expect(page.getByText("กลุ่มช่างทีมเซอร์วิส (1)")).toBeVisible();
  await expect(page.getByText("2 ฒพ 2523")).toHaveCount(0);
  await page.goto("/admin");
  await expect(page.getByText("1 ภน 1001")).toHaveCount(0);
});

test("QR sheet: every car gets a use QR and a fuel QR", async ({ page, request }) => {
  await adminLogin(page);
  await page.goto("/admin/qr?type=internal");
  await expect(page.locator("main svg")).toHaveCount(4);
  await expect(page.getByText(new RegExp(`/f/${pool}$`))).toBeVisible();
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด PNG" }).nth(1).click();
  expect((await dl).suggestedFilename()).toBe("QR-เติมน้ำมัน-1 ภน 1001.png");
  expect((await request.get("/f/v1")).status()).toBe(200); // รถขนส่งก็เติมน้ำมันได้
  expect((await request.get("/f/nope")).status()).toBe(404);
  expect((await request.get(`/f/${pool}`)).status()).toBe(200);
});

test("fuel QR prefills the current driver and saves a bill", async ({ browser, page }) => {
  const ctx = await browser.newContext({ ...devices["Pixel 7"] });
  const m = await ctx.newPage();
  await m.goto(`/v/${pool}`);
  await expect(m.getByText("รถภายในบริษัท · กลุ่มส่วนกลาง")).toBeVisible();
  await m.fill('input[name="employeeCode"]', "E900");
  await m.fill('input[name="destination"]', "ธนาคาร");
  await m.fill('input[name="mileageStart"]', "20000");
  await m.setInputFiles('input[name="selfie"]', img("s"));
  await m.setInputFiles('input[name="photo"]', img("p"));
  await m.getByRole("button", { name: "บันทึกออกเดินทาง" }).click();
  await m.waitForURL(/done\?t=start/);

  await m.goto(`/f/${pool}`);
  await expect(m.getByText("ผู้ใช้รถตอนนี้: คนขับ ภายใน")).toBeVisible();
  await expect(m.locator('input[name="employeeCode"]')).toHaveValue("E900");
  await m.fill('input[name="amount"]', "1,000.50");
  await m.fill('input[name="liters"]', "30.25");
  await m.fill('input[name="mileage"]', "20050");
  await m.setInputFiles('input[name="photoCar"]', img("car"));
  await m.setInputFiles('input[name="photoMileage"]', img("mileage"));
  await m.setInputFiles('input[name="photoLive"]', img("live"));
  await m.locator('input[name="photoBill"]').evaluate((el) => el.removeAttribute("required"));
  await m.getByRole("button", { name: "บันทึกเติมน้ำมัน" }).click();
  await expect(m.getByText("กรุณาแนบรูปบิล")).toBeVisible();
  await m.setInputFiles('input[name="photoBill"]', img("bill"));
  await m.getByRole("button", { name: "บันทึกเติมน้ำมัน" }).click();
  await m.waitForURL(new RegExp(`/f/${pool}/done$`));
  await ctx.close();

  await adminLogin(page);
  await page.goto(`/admin/vehicles/${pool}`);
  const row = page.locator("#fuel tbody tr", { hasText: "1,000.50" });
  await expect(row).toContainText("30.25");
  await expect(row).toContainText("คนขับ ภายใน");

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await (await page.request.get(`/api/export/${pool}`)).body());
  expect(wb.worksheets.map((w) => w.name)).toEqual(["1 ภน 1001", "เติมน้ำมัน"]);
  expect(wb.getWorksheet("เติมน้ำมัน").getCell("F5").value).toBe(1000.5);
});

test("home: รายงาน button adds checkboxes; picked cars open the report", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin?type=internal");
  await expect(page.getByLabel(/^เลือก /)).toHaveCount(0);
  await page.getByRole("link", { name: "รายงาน" }).click();
  await page.waitForURL(/select=1/);
  await page.getByLabel("เลือก 1 ภน 1001").check();
  await page.getByLabel(/กลุ่มช่างทีมเซอร์วิส/).check();
  await expect(page.getByText("เลือกแล้ว 2 คัน")).toBeVisible();
  await page.getByRole("link", { name: "ดูรายงาน" }).click();
  await page.waitForURL(/\/admin\/reports\?v=/);
  await expect(page.getByText("รถที่เลือก 2 คัน: 1 ภน 1001, 1 ภน 2001")).toBeVisible();
  await expect(page.getByText("รวม 2 คัน")).toBeVisible();
  // ยกเลิกโหมดเลือก
  await page.goto("/admin?type=internal&select=1");
  await page.getByRole("link", { name: "ยกเลิก" }).click();
  await expect(page.getByLabel(/^เลือก /)).toHaveCount(0);
});

test("report: tick a group and a plate, one Excel with summary + sheet per car", async ({ page, request }) => {
  await adminLogin(page);
  await page.goto("/admin/reports");
  await page.getByLabel(/กลุ่มส่วนกลาง/).check();
  await page.getByLabel("2 ฒพ 2523").check();
  await expect(page.getByText("เลือกแล้ว 2 คัน")).toBeVisible();
  await page.getByLabel("ช่วงเวลา").selectOption({ label: "เดือนนี้" });
  await page.waitForURL(/\/admin\/reports\?v=/);
  await expect(page.getByText("รวม 2 คัน")).toBeVisible();
  const href = await page.getByRole("link", { name: "ดาวน์โหลด Excel" }).getAttribute("href");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await (await page.request.get(href)).body());
  expect(wb.worksheets.map((w) => w.name)).toEqual(["สรุป", "2 ฒพ 2523", "น้ำมัน 2 ฒพ 2523", "1 ภน 1001", "น้ำมัน 1 ภน 1001"]);
  expect((await request.get("/api/report", { maxRedirects: 0 })).status()).toBe(307); // ต้องล็อกอิน
  expect((await page.request.get("/api/report")).status()).toBe(400);
});

test("Excel: plates that clash as sheet names get unique sheets", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/vehicles?type=internal");
  const codes = [];
  for (const plate of ["9/9 กก", "9-9 กก"]) {
    await page.fill('input[placeholder^="ทะเบียนรถ"]', plate);
    await page.getByRole("button", { name: "เพิ่มรถ" }).click();
    codes.push((await page.getByText(new RegExp(`เพิ่ม ${plate} แล้ว`)).textContent()).match(/รหัส QR (v\d+)/)[1]);
  }
  const r = await page.request.get(`/api/report?v=${codes[0]}&v=${codes[1]}`);
  expect(r.status()).toBe(200);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await r.body());
  expect(wb.worksheets.map((w) => w.name)).toEqual(["สรุป", "9-9 กก", "น้ำมัน 9-9 กก", "9-9 กก (2)", "น้ำมัน 9-9 กก (2)"]);
});

test("car moved from internal to transport keeps its fuel QR and history", async ({ page, request }) => {
  await adminLogin(page);
  await page.goto("/admin/vehicles?type=internal");
  const row = page.locator("tbody tr", { has: page.getByText(pool, { exact: true }) });
  await row.locator('select[name="groupId"]').selectOption("g_transport");
  await row.getByRole("button", { name: "บันทึก" }).click();
  await expect(page.locator("tbody tr", { has: page.getByText(pool, { exact: true }) })).toHaveCount(0);
  expect((await request.get(`/f/${pool}`)).status()).toBe(200);
  await page.goto(`/admin/vehicles/${pool}`);
  await expect(page.locator("#fuel tbody tr", { hasText: "1,000.50" })).toBeVisible();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await (await page.request.get(`/api/export/${pool}`)).body());
  expect(wb.worksheets.map((w) => w.name)).toContain("เติมน้ำมัน");
});

test("fuel row: แก้ไข opens an edit page like trips; save and delete go back to the car", async ({ page }) => {
  await adminLogin(page);
  await page.goto(`/admin/vehicles/${pool}`);
  await expect(page.locator("#fuel").getByText("เรียงตามวันที่บนบิล")).toHaveCount(0);
  const row = page.locator('[data-table="fuel"] tbody tr', { hasText: "1,000.50" });
  await row.getByRole("link", { name: "แก้ไข" }).click();
  await page.waitForURL(/\/admin\/fuel\//);
  await expect(page.getByRole("img", { name: "รูปบิล" })).toBeVisible();
  // ค่าผิดถูกปฏิเสธ
  await page.locator('input[name="liters"]').fill("0");
  await page.getByRole("button", { name: "บันทึกการแก้ไข" }).click();
  await expect(page.getByText("จำนวนลิตรไม่ถูกต้อง")).toBeVisible();
  await page.locator('input[name="liters"]').fill("31.5");
  await page.locator('input[name="driver"]').fill("คนขับ แก้ชื่อ");
  await page.getByRole("button", { name: "บันทึกการแก้ไข" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/vehicles/${pool}[?]month=`));
  const edited = page.locator('[data-table="fuel"] tbody tr', { hasText: "คนขับ แก้ชื่อ" });
  await expect(edited).toContainText("31.50");
  const photo = await edited.locator('a[href^="/api/photos/"]').first().getAttribute("href");

  await edited.getByRole("link", { name: "แก้ไข" }).click();
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "ลบรายการนี้" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/vehicles/${pool}[?]month=`));
  await expect(page.locator('[data-table="fuel"] tbody tr', { hasText: "คนขับ แก้ชื่อ" })).toHaveCount(0);
  expect((await page.request.get(photo)).status()).toBe(404);
});
