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

// "YYYY-MM-DD" ที่เป็นวันที่จริง (กัน 2026-02-31)
export function isDay(s: string | null | undefined): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
}

// "YYYY-MM-DD" → เที่ยงคืนของวันนั้นตามเวลาไทย
export const dayStart = (day: string) => new Date(`${day}T00:00:00+07:00`);
// Date → "YYYY-MM-DD" ตามเวลาไทย
export const dayOf = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
export const today = () => dayOf(new Date());

// ช่วงวันที่ของตาราง/Excel: from–to (วันที่ไทย รวมวันสุดท้าย) ก่อน ถ้าไม่มีใช้ month ถ้าไม่มีอีกใช้เดือนปัจจุบัน
// month = "YYYY-MM" เมื่อช่วงตรงกับทั้งเดือนพอดี (ใช้หัวรายงาน "ประจำเดือน ...") ไม่งั้น null
export function resolvePeriod(q: { month?: string | null; from?: string | null; to?: string | null }) {
  let from: string;
  let to: string;
  if (isDay(q.from) && isDay(q.to)) {
    [from, to] = q.from <= q.to ? [q.from, q.to] : [q.to, q.from];
  } else {
    const m = q.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(q.month) ? q.month : currentMonth();
    const { end } = monthRange(m);
    from = `${m}-01`;
    to = dayOf(new Date(end.getTime() - 1));
  }
  const start = dayStart(from);
  const end = new Date(dayStart(to).getTime() + 86400_000);
  const wholeMonth = from.endsWith("-01") && to.slice(0, 7) === from.slice(0, 7) && dayOf(end).endsWith("-01");
  return { from, to, start, end, month: wholeMonth ? from.slice(0, 7) : null };
}

export type Period = ReturnType<typeof resolvePeriod>;

// ปุ่มลัดช่วงเวลา (คำนวณตามวันที่ไทย ณ ตอนเปิดหน้า)
export function periodPresets() {
  const now = Date.now();
  const today = dayOf(new Date(now));
  const thisMonth = resolvePeriod({ month: currentMonth() });
  const lastMonth = resolvePeriod({ month: monthOf(new Date(thisMonth.start.getTime() - 1)) });
  return [
    { label: "วันนี้", from: today, to: today },
    { label: "เมื่อวาน", from: dayOf(new Date(now - 86400_000)), to: dayOf(new Date(now - 86400_000)) },
    { label: "7 วันล่าสุด", from: dayOf(new Date(now - 6 * 86400_000)), to: today },
    { label: "เดือนนี้", from: thisMonth.from, to: thisMonth.to },
    { label: "เดือนที่แล้ว", from: lastMonth.from, to: lastMonth.to },
  ];
}

// หัวรายงาน: "ประจำเดือน พฤศจิกายน 2569" หรือ "ระหว่างวันที่ 01/11/2569 – 15/11/2569"
export function periodLabel(p: Period) {
  if (p.month) return `ประจำเดือน ${monthLabel(p.month)}`;
  if (p.from === p.to) return `วันที่ ${formatDate(dayStart(p.from))}`;
  return `ระหว่างวันที่ ${formatDate(dayStart(p.from))} – ${formatDate(dayStart(p.to))}`;
}

// "YYYY-MM" ของวันที่นั้นตามเวลาไทย
export function monthOf(d: Date) {
  return d.toLocaleDateString("en-CA", { timeZone: TZ }).slice(0, 7);
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
  return (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

// แปลง Date <-> ค่าของ <input type="datetime-local"> ตามเวลาไทย
export function toLocalInput(d: Date | null) {
  if (!d) return "";
  return new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 16);
}

export function fromLocalInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  return new Date(`${value}:00+07:00`);
}
