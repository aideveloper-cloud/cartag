import { test, expect, devices } from "@playwright/test";
import ExcelJS from "exceljs";

test.describe.configure({ mode: "serial" });

// 1x1 PNG — แอปย่อรูปด้วย canvas ก่อนส่ง จึงต้องเป็นรูปจริง
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const img = (name) => ({ name: `${name}.png`, mimeType: "image/png", buffer: PNG });
const mobile = devices["Pixel 7"];

async function adminLogin(page) {
  await page.goto("/admin/login");
  await page.fill('input[name="password"]', process.env.ADMIN_PW);
  await page.click("button");
  await page.waitForURL(/\/admin$/);
}

async function openScan(browser, code, empCode) {
  const ctx = await browser.newContext({ ...mobile });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`/v/${code}`);
  if (empCode) await page.evaluate((c) => localStorage.setItem("employeeCode", c), empCode);
  return { ctx, page, errors };
}

async function startTrip(page, { emp, dest = "ลูกค้า", mileage, selfie = true, photo = true }) {
  await page.fill('input[name="employeeCode"]', emp);
  await page.fill('input[name="destination"]', dest);
  await page.fill('input[name="mileageStart"]', String(mileage));
  if (selfie) await page.setInputFiles('input[name="selfie"]', img("selfie"));
  if (photo) await page.setInputFiles('input[name="photo"]', img("start"));
  await page.getByRole("button", { name: /บันทึกออกเดินทาง|ยืนยัน/ }).click();
}

async function endTrip(page, { mileage, photo = true }) {
  await page.fill('input[name="mileageEnd"]', String(mileage));
  if (photo) await page.setInputFiles('input[name="photo"]', img("end"));
  await page.getByRole("button", { name: /บันทึกคืนรถ|ยืนยัน/ }).click();
}

// ---------------------------------------------------------------- auth
test("admin pages and APIs require login", async ({ page, request }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  for (const p of ["/admin/employees", "/admin/vehicles/v1", "/admin/qr", "/api/export/v1", "/api/qr/v1"]) {
    const r = await request.get(p, { maxRedirects: 0 });
    expect(r.status(), p).toBe(307);
  }
});

test("wrong admin password is rejected", async ({ page }) => {
  await page.goto("/admin/login");
  await page.fill('input[name="password"]', "wrong-password");
  await page.click("button");
  await expect(page.getByText("รหัสผ่านไม่ถูกต้อง")).toBeVisible();
});

// ---------------------------------------------------------------- employees
test("admin adds and imports employees", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/employees");
  await page.fill('input[placeholder="รหัสพนักงาน"]', "e100");
  await page.fill('input[placeholder="ชื่อ-นามสกุล"]', "ทดสอบ หนึ่ง");
  await page.fill('input[placeholder="แผนก"]', "ไอที");
  await page.getByRole("button", { name: "เพิ่ม", exact: true }).click();
  await expect(page.getByText("เพิ่ม ทดสอบ หนึ่ง แล้ว")).toBeVisible();

  // ซ้ำ (ตัวพิมพ์ต่างกัน) ต้องถูกปฏิเสธ
  await page.fill('input[placeholder="รหัสพนักงาน"]', "E100");
  await page.fill('input[placeholder="ชื่อ-นามสกุล"]', "ซ้ำ");
  await page.fill('input[placeholder="แผนก"]', "ไอที");
  await page.getByRole("button", { name: "เพิ่ม", exact: true }).click();
  await expect(page.getByText("รหัส E100 มีอยู่แล้ว")).toBeVisible();

  await page.fill('textarea[name="rows"]', "E101\tสมหญิง ทดสอบ\tบัญชี\nE102,สมศักดิ์ ยาวมากเป็นพิเศษ นามสกุลยาวเหยียด,จัดซื้อ\nE103\tขาดแผนก\nE104\tจะถูกลบ\tบัญชี");
  await page.getByRole("button", { name: "นำเข้า" }).click();
  await expect(page.getByText(/นำเข้า 3 คน — บรรทัด 3/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "พนักงาน (4 คน)" })).toBeVisible();
});

test("admin deactivates an employee", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/employees");
  const row = page.locator("tr", { has: page.getByText("E101", { exact: true }) });
  await row.locator('input[name="active"]').uncheck();
  await row.getByRole("button", { name: "บันทึก" }).click();
  await expect(page.getByRole("heading", { name: "พนักงาน (3 คน)" })).toBeVisible();
});

// ---------------------------------------------------------------- scan: start trip
test("scan page: employee lookup, no prefilled mileage, required photos", async ({ browser }) => {
  const { ctx, page, errors } = await openScan(browser, "v1");
  await expect(page.locator('input[name="mileageStart"]')).toHaveValue("");
  await expect(page.locator('input[name="photo"]')).toHaveAttribute("required", "");
  await expect(page.locator('input[name="selfie"]')).toHaveAttribute("required", "");

  await page.fill('input[name="employeeCode"]', "e100");
  await expect(page.getByText("✓ ทดสอบ หนึ่ง · ไอที")).toBeVisible();
  await page.fill('input[name="employeeCode"]', "NOPE");
  await expect(page.getByText("ไม่พบรหัสพนักงานนี้")).toBeVisible();
  // พนักงานที่ปิดใช้งานต้องหาไม่เจอ
  await page.fill('input[name="employeeCode"]', "E101");
  await expect(page.getByText("ไม่พบรหัสพนักงานนี้")).toBeVisible();

  // ไม่แนบรูปหน้าปัด → เบราว์เซอร์ไม่ให้ส่ง
  await startTrip(page, { emp: "E100", mileage: 10000, photo: false });
  await expect(page).toHaveURL(/\/v\/v1$/);
  expect(await page.locator('input[name="photo"]').evaluate((el) => el.validity.valueMissing)).toBe(true);
  expect(errors).toEqual([]);
  await ctx.close();
});

test("server rejects a start trip without dashboard photo (required removed)", async ({ browser }) => {
  const { ctx, page } = await openScan(browser, "v1");
  await page.locator('input[name="photo"]').evaluate((el) => el.removeAttribute("required"));
  await startTrip(page, { emp: "E100", mileage: 10000, photo: false });
  await expect(page.getByText("กรุณาถ่ายรูปหน้าปัดเลขไมล์")).toBeVisible();
  await ctx.close();
});

test("server rejects inactive employee even if form is submitted", async ({ browser }) => {
  const { ctx, page } = await openScan(browser, "v1");
  await startTrip(page, { emp: "E101", mileage: 10000 });
  await expect(page.getByText("ไม่พบรหัสพนักงานนี้ กรุณาติดต่อผู้ดูแลระบบ")).toBeVisible();
  await ctx.close();
});

test("invalid mileage values are rejected", async ({ browser }) => {
  const { ctx, page } = await openScan(browser, "v1");
  for (const bad of ["abc", "12000000", "-5", "1.5"]) {
    await page.locator('input[name="mileageStart"]').evaluate((el) => el.removeAttribute("pattern"));
    await startTrip(page, { emp: "E100", mileage: bad });
    await expect(page.getByText("เลขไมล์ไม่ถูกต้อง"), bad).toBeVisible();
  }
  await ctx.close();
});

test("full trip: start then return, distance shown", async ({ browser }) => {
  const { ctx, page, errors } = await openScan(browser, "v1");
  await startTrip(page, { emp: "e100", mileage: "10,000" });
  await expect(page).toHaveURL(/\/v\/v1\/done\?t=start/);
  await expect(page.getByText("บันทึกการออกเดินทางแล้ว")).toBeVisible();

  await page.goto("/v/v1");
  await expect(page.getByRole("heading", { name: "คืนรถ" })).toBeVisible();
  await expect(page.getByText("ทดสอบ หนึ่ง")).toBeVisible();

  await endTrip(page, { mileage: 9999 });
  await expect(page.getByText(/ต้องไม่น้อยกว่าเลขไมล์ก่อนเดินทาง/)).toBeVisible();

  await page.locator('input[name="photo"]').evaluate((el) => el.removeAttribute("required"));
  await page.fill('input[name="mileageEnd"]', "10050");
  await page.locator('input[name="photo"]').setInputFiles([]);
  await page.getByRole("button", { name: /บันทึกคืนรถ/ }).click();
  await expect(page.getByText("กรุณาถ่ายรูปหน้าปัดเลขไมล์")).toBeVisible();

  await endTrip(page, { mileage: "10,050" });
  await expect(page).toHaveURL(/done\?t=end&km=50/);
  await expect(page.getByText("คืนรถเรียบร้อย ระยะทางรวม 50 กม.")).toBeVisible();
  expect(errors).toEqual([]);
  await ctx.close();
});

test("mileage lower than last trip asks for confirmation, then flags the trip", async ({ browser }) => {
  const { ctx, page } = await openScan(browser, "v1");
  await startTrip(page, { emp: "E102", mileage: 10040 });
  await expect(page.getByText(/น้อยกว่าเลขไมล์ล่าสุดของรถคันนี้ \(10,050\)/)).toBeVisible();
  await expect(page.getByRole("button", { name: "ยืนยันว่าถูกต้อง และบันทึก" })).toBeVisible();
  // ไฟล์รูปต้องยังอยู่หลังได้คำเตือน (ไม่ต้องถ่ายใหม่)
  expect(await page.locator('input[name="photo"]').evaluate((el) => el.files.length)).toBe(1);
  await page.getByRole("button", { name: "ยืนยันว่าถูกต้อง และบันทึก" }).click();
  await expect(page).toHaveURL(/done\?t=start/);

  await page.goto("/v/v1");
  await endTrip(page, { mileage: 12000 }); // 1,960 กม. > MAX_TRIP_KM
  await expect(page.getByText(/มากผิดปกติ/)).toBeVisible();
  await page.getByRole("button", { name: "ยืนยันว่าถูกต้อง และบันทึก" }).click();
  await expect(page).toHaveURL(/done\?t=end&km=1960/);
  await ctx.close();
});

test("two phones starting the same car at once create only one open trip", async ({ browser }) => {
  const a = await openScan(browser, "v3");
  const b = await openScan(browser, "v3");
  for (const { page } of [a, b]) {
    await page.fill('input[name="employeeCode"]', "E100");
    await page.fill('input[name="destination"]', "พร้อมกัน");
    await page.fill('input[name="mileageStart"]', "500");
    await page.setInputFiles('input[name="selfie"]', img("s"));
    await page.setInputFiles('input[name="photo"]', img("p"));
  }
  await Promise.all([a, b].map(({ page }) => page.getByRole("button", { name: "บันทึกออกเดินทาง" }).click()));
  await Promise.all([a, b].map(({ page }) => page.waitForLoadState("networkidle")));
  const done = [a, b].filter(({ page }) => /done\?t=start/.test(page.url())).length;
  await a.ctx.close();
  await b.ctx.close();
  expect(done, "both phones got a success page for the same car").toBe(1);
});

test("unknown vehicle code returns 404", async ({ request }) => {
  expect((await request.get("/v/doesnotexist")).status()).toBe(404);
});

test("scan page fits a phone screen", async ({ browser }) => {
  const { ctx, page } = await openScan(browser, "v2");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await ctx.close();
});

// ---------------------------------------------------------------- admin views
test("admin dashboard lists flagged trips", async ({ page }) => {
  await adminLogin(page);
  await expect(page.getByText(/รายการที่ต้องตรวจ/)).toBeVisible();
  await expect(page.getByText(/สมศักดิ์/).first()).toBeVisible();
});

test("monthly table shows trips, totals and photo links", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await adminLogin(page);
  await page.goto("/admin/vehicles/v1");
  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText("ทดสอบ หนึ่ง");
  await expect(page.locator("tfoot")).toContainText("2,010");
  const photo = await page.request.get(await page.locator('tbody a[href^="/api/photos/"]').first().getAttribute("href"));
  expect(photo.status()).toBe(200);
  expect(photo.headers()["content-type"]).toMatch(/image/);
  // ช่องผู้ใช้รถกว้างกว่ากลุ่ม "ออกเดินทางจาก"
  const userW = (await page.locator("thead th", { hasText: "ผู้ใช้รถ" }).boundingBox()).width;
  const originW = (await page.locator("thead th", { hasText: "ออกเดินทางจาก" }).boundingBox()).width;
  expect(userW).toBeGreaterThan(originW);
  expect(errors).toEqual([]);
});

test("photos API refuses path tricks", async ({ page }) => {
  await adminLogin(page);
  for (const p of ["/api/photos/..%2F..%2Fetc%2Fpasswd", "/api/photos/not-a-uuid", "/api/photos/00000000-0000-0000-0000-000000000000"]) {
    const r = await page.request.get(p);
    expect(r.status(), p).toBeGreaterThanOrEqual(400);
  }
});

test("Excel export has expected layout and numbers", async ({ page }) => {
  await adminLogin(page);
  const month = await page.evaluate(() => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }).slice(0, 7));
  const r = await page.request.get(`/api/export/v1?month=${month}`);
  expect(r.status()).toBe(200);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await r.body());
  const ws = wb.worksheets[0];
  expect(ws.getColumn(4).width).toBeGreaterThan(ws.getColumn(2).width);
  expect(ws.getCell("D4").value).toBe("ผู้ใช้รถ");
  expect(ws.getCell("D6").value).toBe("ทดสอบ หนึ่ง");
  expect(ws.getCell("H6").value).toBe(10000);
  expect(ws.getCell("J6").value).toBe(50);
  expect(ws.getCell("J7").value).toBe(1960);
  // แถวรวมอยู่หลังแถวขั้นต่ำ 13 แถว
  expect(ws.getCell("J19").value.formula).toBe("SUM(J6:J18)");
  // เดือนรูปแบบผิดต้องไม่พัง
  expect((await page.request.get("/api/export/v1?month=garbage")).status()).toBe(200);
  expect((await page.request.get("/api/export/nope")).status()).toBe(404);
});

test("QR page and QR image", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/qr");
  await expect(page.locator("main svg")).toHaveCount(5);
  await expect(page.getByText(/\/v\/v1$/)).toBeVisible();
  const r = await page.request.get("/api/qr/v1");
  expect(r.status()).toBe(200);
  expect(r.headers()["content-type"]).toMatch(/image/);
  // ข้อสังเกต: รหัสรถที่ไม่มีอยู่ก็ยังได้ QR (ไม่ใช่ 404)
  console.log("QR for unknown vehicle:", (await page.request.get("/api/qr/nope")).status());
});

// ---------------------------------------------------------------- admin edits
test("admin trip edit validates and saves", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/vehicles/v1");
  await page.locator("tbody tr").first().getByRole("link", { name: "แก้ไข" }).click();
  await page.fill('input[name="mileageEnd"]', "9000");
  await page.getByRole("button", { name: /บันทึก/ }).first().click();
  await expect(page.getByText("เลขไมล์หลังเดินทางน้อยกว่าก่อนเดินทาง")).toBeVisible();

  await page.fill('input[name="mileageEnd"]', "");
  await page.getByRole("button", { name: /บันทึก/ }).first().click();
  await expect(page.getByText(/ต้องกรอกทั้งเวลาคืนรถและเลขไมล์หลังเดินทาง/)).toBeVisible();

  await page.fill('input[name="mileageEnd"]', "10060");
  await page.fill('input[name="destination"]', "แก้ไขแล้ว");
  await page.getByRole("button", { name: /บันทึก/ }).first().click();
  await expect(page).toHaveURL(/\/admin\/vehicles\/v1\?month=/);
  await expect(page.locator("tbody tr").first()).toContainText("แก้ไขแล้ว");
  await expect(page.locator("tbody tr").first()).toContainText("60");
});

test("admin clears a warning", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/vehicles/v1");
  await page.locator("tbody tr").nth(1).getByRole("link", { name: "แก้ไข" }).click();
  await page.locator('input[name="clearWarnings"]').check();
  await page.getByRole("button", { name: /บันทึก/ }).first().click();
  await expect(page).toHaveURL(/\/admin\/vehicles\/v1\?month=/);
  await page.goto("/admin");
  await expect(page.getByText(/รายการที่ต้องตรวจ/)).toHaveCount(0);
});

test("deleting an employee keeps their trip history", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/employees");
  page.on("dialog", (d) => d.accept());
  const row = page.locator("tr", { has: page.getByText("E102", { exact: true }) });
  await row.getByRole("button", { name: "ลบ" }).click();
  await expect(page.getByText("E102", { exact: true })).toHaveCount(0);
  await page.goto("/admin/vehicles/v1");
  await expect(page.locator("tbody")).toContainText("สมศักดิ์ ยาวมากเป็นพิเศษ");
});

test("cancelling the delete confirm keeps the employee", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/employees");
  page.on("dialog", (d) => d.dismiss());
  const row = page.locator("tr", { has: page.getByText("E104", { exact: true }) });
  await row.getByRole("button", { name: "ลบ" }).click();
  await page.waitForTimeout(1000);
  await expect(page.getByText("E104", { exact: true })).toHaveCount(1);
});

test("deleted employee code can be re-added and can borrow", async ({ page, browser }) => {
  await adminLogin(page);
  await page.goto("/admin/employees");
  await page.fill('input[placeholder="รหัสพนักงาน"]', "E102");
  await page.fill('input[placeholder="ชื่อ-นามสกุล"]', "กลับมาใหม่");
  await page.fill('input[placeholder="แผนก"]', "จัดซื้อ");
  await page.getByRole("button", { name: "เพิ่ม", exact: true }).click();
  await expect(page.getByText("เพิ่ม กลับมาใหม่ แล้ว")).toBeVisible();
  const { ctx, page: scan } = await openScan(browser, "v2");
  await scan.fill('input[name="employeeCode"]', "E102");
  await expect(scan.getByText("✓ กลับมาใหม่ · จัดซื้อ")).toBeVisible();
  await ctx.close();
});

test("admin deletes a trip", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/vehicles/v1");
  await page.locator("tbody tr").nth(1).getByRole("link", { name: "แก้ไข" }).click();
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "ลบรายการนี้" }).click();
  await expect(page).toHaveURL(/\/admin\/vehicles\/v1/);
  await expect(page.locator("tbody tr")).toHaveCount(1);
});

test("logout ends the session", async ({ page }) => {
  await adminLogin(page);
  await page.getByRole("button", { name: "ออกจากระบบ" }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
});
