// role viewer (ดูอย่างเดียว) — รันหลัง cartag.spec / race.spec / vehicles.spec (มีรถ v1 ที่มีทริปและรูปแล้ว)
// ไม่เขียนข้อมูลเลย: action ของ admin ถูกจับแล้วยกเลิกก่อนถึง server (เอาไว้ยิงซ้ำในนามของ viewer)
//
// .env.e2e มี VIEWER_PW  → server ต้องตั้ง VIEWER_PASSWORD เป็นค่าเดียวกัน → เทสกลุ่ม "viewer enabled"
// .env.e2e ไม่มี VIEWER_PW → server ต้องไม่ตั้ง VIEWER_PASSWORD           → เทสกลุ่ม "viewer disabled"
import { test, expect } from "@playwright/test";
import crypto from "node:crypto";

test.describe.configure({ mode: "serial" });

const VIEWER_PW = process.env.VIEWER_PW;
const TRIP_ROWS = '[data-table="trips"] tbody tr';
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

async function login(page, password) {
  await page.goto("/admin/login");
  await page.fill('input[name="password"]', password);
  await page.click("button");
  await page.waitForURL(/\/admin$/);
}

// ยิง server action ผ่าน UI ของ admin แล้วจับ request ไว้ (ยกเลิกไม่ให้ถึง server) — คืน { url, headers, body }
async function captureAction(page, act) {
  let captured;
  await page.route("**/*", async (route) => {
    const req = route.request();
    if (req.method() === "POST" && req.headers()["next-action"] && !captured) {
      captured = { url: req.url(), headers: req.headers(), body: req.postDataBuffer() };
      return route.abort();
    }
    return route.continue();
  });
  await act();
  await expect.poll(() => captured, { message: "จับ server action ไม่ได้" }).toBeTruthy();
  await page.unroute("**/*");
  return captured;
}

// ยิง action ที่จับไว้ซ้ำด้วยคุกกี้ของ context นี้ (viewer)
function replay(request, { url, headers, body }) {
  const keep = ["next-action", "content-type", "next-router-state-tree", "accept"];
  return request.post(url, {
    headers: Object.fromEntries(Object.entries(headers).filter(([k]) => keep.includes(k))),
    data: body,
    maxRedirects: 0,
  });
}

test.describe("viewer enabled", () => {
  test.skip(!VIEWER_PW, "ไม่มี VIEWER_PW ใน .env.e2e");

  test("viewer logs in, sees vehicles and reports, downloads Excel, QR and photos", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await login(page, VIEWER_PW);
    await expect(page.getByRole("status")).toContainText("โหมดดูอย่างเดียว");
    await expect(page.getByText("2 ฒพ 2523")).toBeVisible();

    await page.goto("/admin/vehicles");
    await expect(page.getByRole("heading", { name: /^รถ \(\d+ คัน\)$/ })).toBeVisible();
    await expect(page.locator("tbody tr td:first-child").first()).toHaveText("v1");

    await page.goto("/admin/reports?v=v1&v=v2");
    await expect(page.getByText("รวม 2 คัน")).toBeVisible();
    const report = await page.request.get(await page.getByRole("link", { name: "ดาวน์โหลด Excel" }).getAttribute("href"));
    expect(report.status()).toBe(200);
    expect(report.headers()["content-type"]).toMatch(/spreadsheetml/);

    const exp = await page.request.get("/api/export/v1");
    expect(exp.status()).toBe(200);
    expect(exp.headers()["content-type"]).toMatch(/spreadsheetml/);
    expect((await page.request.get("/api/qr/v1")).headers()["content-type"]).toMatch(/image/);

    await page.goto("/admin/vehicles/v1");
    const photo = await page.locator(`${TRIP_ROWS} a[href^="/api/photos/"]`).first().getAttribute("href");
    expect((await page.request.get(photo)).status()).toBe(200);
    expect(errors).toEqual([]);
  });

  test("viewer sees no add/edit/delete/import controls", async ({ page, browser }) => {
    // id ของทริปหนึ่งรายการ (จากฝั่ง admin)
    const adminCtx = await browser.newContext();
    const admin = await adminCtx.newPage();
    await login(admin, process.env.ADMIN_PW);
    await admin.goto("/admin/vehicles/v1");
    const tripHref = await admin.locator(TRIP_ROWS).first().getByRole("link", { name: "แก้ไข" }).getAttribute("href");
    await adminCtx.close();

    await login(page, VIEWER_PW);
    await page.goto("/admin/vehicles");
    await expect(page.getByRole("button", { name: "เพิ่มรถ" })).toHaveCount(0);
    await expect(page.locator('input[name="plate"]')).toHaveCount(0);
    await expect(page.getByRole("button", { name: /บันทึก|ลบ/ })).toHaveCount(0);

    await page.goto("/admin/employees");
    await expect(page.locator("tbody tr").first()).toBeVisible();
    await expect(page.locator('textarea[name="rows"]')).toHaveCount(0);
    await expect(page.locator("main input")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /เพิ่ม|นำเข้า|บันทึก|ลบ/ })).toHaveCount(0);

    await page.goto("/admin/vehicles/v1");
    await expect(page.locator(TRIP_ROWS).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "แก้ไข" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /เปิดหน้าสแกน|เปิดหน้าเติมน้ำมัน/ })).toHaveCount(0);

    await page.goto(tripHref);
    await expect(page.getByRole("heading", { name: /รายละเอียดรายการ/ })).toBeVisible();
    await expect(page.locator("main form")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /บันทึกการแก้ไข|ลบรายการนี้/ })).toHaveCount(0);

    await page.goto("/admin");
    await expect(page.getByRole("link", { name: "เพิ่มพนักงาน" })).toHaveCount(0);
  });

  test("viewer calling write server actions directly is refused; nothing changes", async ({ page, browser }) => {
    const adminCtx = await browser.newContext();
    const admin = await adminCtx.newPage();
    admin.on("dialog", (d) => d.accept());
    await login(admin, process.env.ADMIN_PW);

    // 1) แก้ทะเบียน v1
    await admin.goto("/admin/vehicles");
    const v1 = admin.locator("tbody tr", { has: admin.getByText("v1", { exact: true }) });
    const plateBefore = await v1.locator('input[name="plate"]').inputValue();
    await v1.locator('input[name="plate"]').fill("VIEWER-HACK");
    const rename = await captureAction(admin, () => v1.getByRole("button", { name: "บันทึก" }).click());
    // 2) เพิ่มพนักงาน
    await admin.goto("/admin/employees");
    await admin.fill('input[placeholder="รหัสพนักงาน"]', "VHACK");
    await admin.fill('input[placeholder="ชื่อ-นามสกุล"]', "ผู้บุกรุก");
    await admin.fill('input[placeholder="แผนก"]', "ไม่มี");
    const addEmp = await captureAction(admin, () => admin.getByRole("button", { name: "เพิ่ม", exact: true }).click());
    // 3) ลบทริปแรกของ v1
    await admin.goto("/admin/vehicles/v1");
    const tripsBefore = await admin.locator(TRIP_ROWS).count();
    await admin.locator(TRIP_ROWS).first().getByRole("link", { name: "แก้ไข" }).click();
    await admin.waitForURL(/\/admin\/trips\//);
    const delTrip = await captureAction(admin, () => admin.getByRole("button", { name: "ลบรายการนี้" }).click());

    await login(page, VIEWER_PW);
    for (const [name, action] of [["rename vehicle", rename], ["add employee", addEmp], ["delete trip", delTrip]]) {
      const r = await replay(page.request, action);
      expect(r.status(), `${name}: viewer must be refused`).toBeGreaterThanOrEqual(400);
    }

    // ไม่มีอะไรเปลี่ยน
    await admin.goto("/admin/vehicles");
    await expect(admin.locator("tbody tr", { has: admin.getByText("v1", { exact: true }) }).locator('input[name="plate"]')).toHaveValue(plateBefore);
    await admin.goto("/admin/employees");
    await expect(admin.getByText("VHACK", { exact: true })).toHaveCount(0);
    await admin.goto("/admin/vehicles/v1");
    await expect(admin.locator(TRIP_ROWS)).toHaveCount(tripsBefore);

    // ยิงซ้ำด้วยคุกกี้ admin ต้องผ่าน (พิสูจน์ว่า request ที่จับมาใช้ได้จริง — ที่ viewer โดนปฏิเสธเพราะสิทธิ์)
    const ok = await replay(admin.request, addEmp);
    expect(ok.status()).toBeLessThan(400);
    await admin.goto("/admin/employees");
    await expect(admin.getByText("VHACK", { exact: true })).toBeVisible();
    await admin.locator("tr", { has: admin.getByText("VHACK", { exact: true }) }).getByRole("button", { name: "ลบ" }).click();
    await expect(admin.getByText("VHACK", { exact: true })).toHaveCount(0);
    await adminCtx.close();
  });

  test("viewer cookie cannot be edited into admin; admin still has full controls and no banner", async ({ page, context, baseURL }) => {
    await login(page, VIEWER_PW);
    const host = new URL(baseURL).hostname;
    for (const value of ["admin", sha256(`qrtracker:${VIEWER_PW}`), sha256("qrtracker:")]) {
      await context.clearCookies();
      await context.addCookies([{ name: "admin_session", value, domain: host, path: "/" }]);
      const r = await page.request.get("/admin", { maxRedirects: 0 });
      expect(r.status(), `forged cookie ${value.slice(0, 8)}…`).toBe(307);
    }

    await context.clearCookies();
    await login(page, process.env.ADMIN_PW);
    await expect(page.getByRole("status")).toHaveCount(0);
    await page.goto("/admin/vehicles");
    await expect(page.getByRole("button", { name: "เพิ่มรถ" })).toBeVisible();
    await page.goto("/admin/vehicles/v1");
    await expect(page.getByRole("link", { name: "แก้ไข" }).first()).toBeVisible();
  });
});

test.describe("viewer disabled (no VIEWER_PASSWORD)", () => {
  test.skip(!!VIEWER_PW, "มี VIEWER_PW ใน .env.e2e — กลุ่มนี้รันเมื่อ server ไม่ได้ตั้ง VIEWER_PASSWORD");

  test("no one can log in or forge a viewer session; admin works as before", async ({ page, context, baseURL }) => {
    for (const pw of ["viewer", "viewer1234", ""]) {
      await page.goto("/admin/login");
      await page.fill('input[name="password"]', pw);
      await page.locator('input[name="password"]').evaluate((el) => el.removeAttribute("required"));
      await page.click("button");
      await expect(page.getByText("รหัสผ่านไม่ถูกต้อง")).toBeVisible();
    }
    const host = new URL(baseURL).hostname;
    for (const value of [sha256("qrtracker-viewer:"), sha256("qrtracker-viewer:undefined")]) {
      await context.clearCookies();
      await context.addCookies([{ name: "admin_session", value, domain: host, path: "/" }]);
      expect((await page.request.get("/admin", { maxRedirects: 0 })).status()).toBe(307);
      expect((await page.request.get("/api/export/v1", { maxRedirects: 0 })).status()).toBe(307);
    }
    await context.clearCookies();
    await login(page, process.env.ADMIN_PW);
    await expect(page.getByRole("status")).toHaveCount(0);
    await page.goto("/admin/vehicles");
    await expect(page.getByRole("button", { name: "เพิ่มรถ" })).toBeVisible();
  });
});
