// Playwright — ยิงเทสไปที่ cartag-test บน ServerKG (ไม่เปิด server บนเครื่อง dev)
// ค่าอยู่ใน .env.e2e (ไม่ commit): BASE=http://192.168.1.10:8004  ADMIN_PW=<รหัสแอดมินของ cartag-test>
// เทสแก้ข้อมูลใน DB cartag_test และต้องเริ่มจาก DB ว่าง — รันผ่าน `npm run e2e` (ล้าง DB ให้ก่อน)
import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";

const env = Object.fromEntries(
  fs
    .readFileSync(new URL("../.env.e2e", import.meta.url), "utf8")
    .trim()
    .split("\n")
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
process.env.ADMIN_PW = env.ADMIN_PW;

export default defineConfig({
  testDir: ".",
  // ทุกไฟล์ใช้ DB เดียวกันและต่อจากกัน (race.spec ใช้พนักงานที่ cartag.spec สร้าง) จึงรันทีละไฟล์ตามลำดับชื่อ
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  reporter: [["list"]],
  outputDir: "../test-results",
  use: {
    baseURL: env.BASE,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "th-TH",
    timezoneId: "Asia/Bangkok",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
