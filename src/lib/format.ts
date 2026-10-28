const TZ = "Asia/Bangkok";

// วันที่แบบไทย (พ.ศ.) เช่น 28/10/2569
export function formatDate(d: Date) {
  return d.toLocaleDateString("th-TH", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" });
}

// เวลา 24 ชม. เช่น 08:30
export function formatTime(d: Date) {
  return d.toLocaleTimeString("th-TH", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
}

// "YYYY-MM" ของเดือนปัจจุบันตามเวลาไทย
export function currentMonth() {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ }).slice(0, 7);
}

// ช่วงเวลาของเดือน (ตามเวลาไทย UTC+7) สำหรับ query
export function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1, -7));
  const end = new Date(Date.UTC(y, m, 1, -7));
  return { start, end };
}

export function monthLabel(month: string) {
  const { start } = monthRange(month);
  return start.toLocaleDateString("th-TH", { timeZone: TZ, month: "long", year: "numeric" });
}

// เวลาคืนรถ: ถ้าคืนคนละวันกับที่ออก แสดงวันที่ด้วย
export function formatReturn(departedAt: Date, returnedAt: Date | null) {
  if (!returnedAt) return "";
  const time = formatTime(returnedAt);
  return formatDate(returnedAt) === formatDate(departedAt) ? time : `${formatDate(returnedAt)} ${time}`;
}

export function baseUrl() {
  return (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
