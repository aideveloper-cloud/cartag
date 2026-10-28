import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const MAX_BYTES = 10 * 1024 * 1024;

// บันทึกรูปจากฟอร์ม คืนชื่อไฟล์ หรือ null ถ้าไม่ได้แนบ
export async function savePhoto(file: FormDataEntryValue | null): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (!file.type.startsWith("image/")) throw new Error("ไฟล์แนบต้องเป็นรูปภาพ");
  if (file.size > MAX_BYTES) throw new Error("รูปมีขนาดใหญ่เกิน 10MB");

  const name = `${crypto.randomUUID()}.jpg`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return name;
}

export async function readPhoto(name: string) {
  // กัน path traversal: ยอมรับเฉพาะชื่อที่ระบบสร้าง
  if (!/^[0-9a-f-]{36}\.jpg$/.test(name)) return null;
  return readFile(path.join(UPLOAD_DIR, name)).catch(() => null);
}
