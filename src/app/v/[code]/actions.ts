"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { savePhoto } from "@/lib/photos";
import { getOpenTrip, getVehicleByCode } from "@/lib/trips";

export type FormState = { error?: string };

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function mileage(form: FormData, key: string) {
  const raw = text(form, key).replace(/,/g, "");
  if (!/^\d+$/.test(raw)) return null;
  return Number(raw);
}

export async function startTrip(code: string, _prev: FormState, form: FormData): Promise<FormState> {
  const vehicle = await getVehicleByCode(code);
  if (!vehicle) return { error: "ไม่พบรถคันนี้" };
  if (await getOpenTrip(vehicle.id)) return { error: "รถคันนี้ยังมีรายการที่ยังไม่คืนรถ กรุณารีเฟรชหน้า" };

  const origin = text(form, "origin");
  const driver = text(form, "driver");
  const department = text(form, "department");
  const destination = text(form, "destination");
  const mileageStart = mileage(form, "mileageStart");

  if (!origin || !driver || !department || !destination) return { error: "กรุณากรอกข้อมูลให้ครบ" };
  if (mileageStart === null) return { error: "เลขไมล์ต้องเป็นตัวเลข" };

  let photoStart: string | null;
  try {
    photoStart = await savePhoto(form.get("photo"));
  } catch (e) {
    return { error: (e as Error).message };
  }

  await prisma.trip.create({
    data: { vehicleId: vehicle.id, origin, driver, department, destination, mileageStart, photoStart },
  });
  redirect(`/v/${code}/done?t=start`);
}

export async function endTrip(code: string, _prev: FormState, form: FormData): Promise<FormState> {
  const vehicle = await getVehicleByCode(code);
  if (!vehicle) return { error: "ไม่พบรถคันนี้" };
  const trip = await getOpenTrip(vehicle.id);
  if (!trip) return { error: "ไม่พบรายการที่ยังไม่คืนรถ กรุณารีเฟรชหน้า" };

  const mileageEnd = mileage(form, "mileageEnd");
  if (mileageEnd === null) return { error: "เลขไมล์ต้องเป็นตัวเลข" };
  if (mileageEnd < trip.mileageStart) {
    return { error: `เลขไมล์หลังเดินทางต้องไม่น้อยกว่าเลขไมล์ก่อนเดินทาง (${trip.mileageStart.toLocaleString()})` };
  }

  let photoEnd: string | null;
  try {
    photoEnd = await savePhoto(form.get("photo"));
  } catch (e) {
    return { error: (e as Error).message };
  }

  await prisma.trip.update({
    where: { id: trip.id },
    data: { mileageEnd, returnedAt: new Date(), photoEnd },
  });
  redirect(`/v/${code}/done?t=end&km=${mileageEnd - trip.mileageStart}`);
}
