import { SELFIE_RETENTION_DAYS } from "./config";
import { prisma } from "./db";

const MAX_BYTES = 10 * 1024 * 1024;
const ID_RE = /^[0-9a-f-]{36}$/;

// บันทึกรูปจากฟอร์ม คืน id ของรูป หรือ null ถ้าไม่ได้แนบ
export async function savePhoto(file: FormDataEntryValue | null): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (!file.type.startsWith("image/")) throw new Error("ไฟล์แนบต้องเป็นรูปภาพ");
  if (file.size > MAX_BYTES) throw new Error("รูปมีขนาดใหญ่เกิน 10MB");

  const photo = await prisma.photo.create({
    data: { data: new Uint8Array(await file.arrayBuffer()) },
    select: { id: true },
  });
  return photo.id;
}

export async function readPhoto(id: string) {
  if (!ID_RE.test(id)) return null;
  const photo = await prisma.photo.findUnique({ where: { id } });
  return photo?.data ?? null;
}

export async function deletePhotos(ids: (string | null)[]) {
  const valid = ids.filter((id): id is string => !!id && ID_RE.test(id));
  if (valid.length) await prisma.photo.deleteMany({ where: { id: { in: valid } } });
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
