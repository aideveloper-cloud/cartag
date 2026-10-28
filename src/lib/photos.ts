import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { SELFIE_RETENTION_DAYS } from "./config";
import { prisma } from "./db";

export const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const MAX_BYTES = 10 * 1024 * 1024;
const NAME_RE = /^[0-9a-f-]{36}\.jpg$/;

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
  if (!NAME_RE.test(name)) return null;
  return readFile(path.join(UPLOAD_DIR, name)).catch(() => null);
}

export async function deletePhotos(names: (string | null)[]) {
  for (const name of names) {
    if (name && NAME_RE.test(name)) await rm(path.join(UPLOAD_DIR, name), { force: true });
  }
}

// ลบรูปหน้าผู้ยืมที่เก่ากว่าระยะเวลาที่กำหนด
export async function purgeOldSelfies() {
  const cutoff = new Date(Date.now() - SELFIE_RETENTION_DAYS * 86400_000);
  const old = await prisma.trip.findMany({
    where: { selfie: { not: null }, departedAt: { lt: cutoff } },
    select: { id: true, selfie: true },
  });
  if (old.length === 0) return;
  await deletePhotos(old.map((t) => t.selfie));
  await prisma.trip.updateMany({ where: { id: { in: old.map((t) => t.id) } }, data: { selfie: null } });
}
