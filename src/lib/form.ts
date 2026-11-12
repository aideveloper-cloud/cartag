import { MAX_MILEAGE } from "./config";

// ผลของฟอร์มฝั่งพนักงาน — warning = ข้อมูลผิดปกติแต่อาจถูกต้อง ผู้ใช้กดยืนยันแล้วส่งซ้ำพร้อม confirm=1 ได้
export type FormState = { error?: string; warning?: string };

export function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

// เลขไมล์: ตัวเลขล้วน (มี , ได้) ไม่เกิน 7 หลัก — ไม่ถูกต้องคืน null
export function mileage(form: FormData, key: string) {
  const raw = text(form, key).replace(/,/g, "");
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n <= MAX_MILEAGE ? n : null;
}

// จำนวนเงิน/ลิตร: ทศนิยมไม่เกิน 2 ตำแหน่ง มากกว่า 0 และไม่เกิน max — ไม่ถูกต้องคืน null
// รับ ".5" ด้วย (ช่องบนมือถือยอมให้พิมพ์) → "0.5"
export function decimal(form: FormData, key: string, max: number) {
  let raw = text(form, key).replace(/,/g, "");
  if (raw.startsWith(".")) raw = `0${raw}`;
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;
  const n = Number(raw);
  return n > 0 && n <= max ? raw : null;
}

export const hasFile = (v: FormDataEntryValue | null) => v instanceof File && v.size > 0;

export const km = (n: number) => n.toLocaleString("en-US");
