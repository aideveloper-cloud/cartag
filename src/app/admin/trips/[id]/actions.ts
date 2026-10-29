"use server";

import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/admin";
import { MAX_MILEAGE } from "@/lib/config";
import { isUniqueViolation, prisma } from "@/lib/db";
import { fromLocalInput, monthOf } from "@/lib/format";
import { deletePhotos } from "@/lib/photos";

export type EditState = { error?: string };

const clean = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

function mileage(raw: string) {
  const v = raw.replace(/,/g, "");
  if (v === "") return undefined;
  if (!/^\d+$/.test(v) || Number(v) > MAX_MILEAGE) return null;
  return Number(v);
}

async function backToLog(vehicleId: string, departedAt: Date): Promise<never> {
  const vehicle = await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId } });
  redirect(`/admin/vehicles/${vehicle.code}?month=${monthOf(departedAt)}`);
}

export async function updateTrip(id: string, _prev: EditState, form: FormData): Promise<EditState> {
  await assertAdmin();
  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip) return { error: "ไม่พบรายการ" };

  const departedAt = fromLocalInput(clean(form, "departedAt"));
  const returnedRaw = clean(form, "returnedAt");
  const returnedAt = returnedRaw ? fromLocalInput(returnedRaw) : null;
  const mileageStart = mileage(clean(form, "mileageStart"));
  const mileageEnd = mileage(clean(form, "mileageEnd"));
  const fields = {
    driver: clean(form, "driver"),
    department: clean(form, "department"),
    origin: clean(form, "origin"),
    destination: clean(form, "destination"),
  };

  if (Object.values(fields).some((v) => !v)) return { error: "กรอกข้อมูลให้ครบ" };
  if (!departedAt || (returnedRaw && !returnedAt)) return { error: "วันที่/เวลาไม่ถูกต้อง" };
  if (mileageStart === null || mileageStart === undefined || mileageEnd === null) return { error: "เลขไมล์ไม่ถูกต้อง" };
  if ((mileageEnd === undefined) !== (returnedAt === null)) {
    return { error: "ถ้าคืนรถแล้ว ต้องกรอกทั้งเวลาคืนรถและเลขไมล์หลังเดินทาง (ถ้ายังไม่คืน ให้เว้นว่างทั้งคู่)" };
  }
  if (mileageEnd !== undefined && mileageEnd < mileageStart) return { error: "เลขไมล์หลังเดินทางน้อยกว่าก่อนเดินทาง" };
  if (returnedAt && returnedAt < departedAt) return { error: "เวลาคืนรถอยู่ก่อนเวลาออก" };
  if (mileageEnd === undefined) {
    const otherOpen = await prisma.trip.findFirst({ where: { vehicleId: trip.vehicleId, mileageEnd: null, id: { not: id } } });
    if (otherOpen) return { error: "รถคันนี้มีรายการอื่นที่ยังไม่คืนอยู่แล้ว" };
  }

  try {
    await prisma.trip.update({
      where: { id },
      data: {
        ...fields,
        departedAt,
        returnedAt,
        mileageStart,
        mileageEnd: mileageEnd ?? null,
        // แอดมินตรวจแล้ว ล้างคำเตือนได้
        warnings: form.get("clearWarnings") === "on" ? null : trip.warnings,
      },
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { error: "รถคันนี้มีรายการอื่นที่ยังไม่คืนอยู่แล้ว" };
    throw e;
  }
  return backToLog(trip.vehicleId, departedAt);
}

export async function deleteTrip(id: string) {
  await assertAdmin();
  const trip = await prisma.trip.delete({ where: { id } });
  await deletePhotos([trip.photoStart, trip.photoEnd, trip.selfie]);
  return backToLog(trip.vehicleId, trip.departedAt);
}
