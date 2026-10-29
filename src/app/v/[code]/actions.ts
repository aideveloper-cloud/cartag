"use server";

import { redirect } from "next/navigation";
import { MAX_MILEAGE, MAX_TRIP_KM } from "@/lib/config";
import { isUniqueViolation, prisma } from "@/lib/db";
import { deletePhotos, purgeOldSelfies, savePhoto } from "@/lib/photos";
import { findActiveEmployee, getLastMileage, getOpenTrip, getVehicleByCode } from "@/lib/trips";

// warning = ข้อมูลผิดปกติแต่อาจถูกต้อง ผู้ใช้กดยืนยันแล้วส่งซ้ำพร้อม confirm=1 ได้
export type FormState = { error?: string; warning?: string };

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function mileage(form: FormData, key: string) {
  const raw = text(form, key).replace(/,/g, "");
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n <= MAX_MILEAGE ? n : null;
}

const km = (n: number) => n.toLocaleString("en-US");

const hasFile = (v: FormDataEntryValue | null) => v instanceof File && v.size > 0;

export async function lookupEmployee(code: string) {
  const emp = await findActiveEmployee(code);
  return emp ? { name: emp.name, department: emp.department } : null;
}

export async function startTrip(code: string, _prev: FormState, form: FormData): Promise<FormState> {
  const vehicle = await getVehicleByCode(code);
  if (!vehicle) return { error: "ไม่พบรถคันนี้" };
  if (await getOpenTrip(vehicle.id)) return { error: "รถคันนี้ยังมีรายการที่ยังไม่คืนรถ กรุณารีเฟรชหน้า" };

  const employee = await findActiveEmployee(text(form, "employeeCode"));
  if (!employee) return { error: "ไม่พบรหัสพนักงานนี้ กรุณาติดต่อผู้ดูแลระบบ" };

  const origin = text(form, "origin");
  const destination = text(form, "destination");
  const mileageStart = mileage(form, "mileageStart");
  if (!origin || !destination) return { error: "กรุณากรอกข้อมูลให้ครบ" };
  if (mileageStart === null) return { error: "เลขไมล์ไม่ถูกต้อง" };

  const selfieFile = form.get("selfie");
  if (!hasFile(selfieFile)) return { error: "กรุณาถ่ายรูปหน้าผู้ยืมรถ" };
  if (!hasFile(form.get("photo"))) return { error: "กรุณาถ่ายรูปหน้าปัดเลขไมล์" };

  const warnings: string[] = [];
  const last = await getLastMileage(vehicle.id);
  if (last !== null && mileageStart < last) {
    warnings.push(`เลขไมล์ (${km(mileageStart)}) น้อยกว่าเลขไมล์ล่าสุดของรถคันนี้ (${km(last)})`);
  } else if (last !== null && mileageStart - last > MAX_TRIP_KM) {
    warnings.push(`เลขไมล์มากกว่าครั้งล่าสุด ${km(mileageStart - last)} กม. อาจมีการใช้รถที่ไม่ได้บันทึก`);
  }
  if (warnings.length && form.get("confirm") !== "1") return { warning: warnings.join("\n") };

  let selfie: string | null = null;
  let photoStart: string | null = null;
  try {
    selfie = await savePhoto(selfieFile);
    photoStart = await savePhoto(form.get("photo"));
  } catch (e) {
    await deletePhotos([selfie]);
    return { error: (e as Error).message };
  }

  try {
    await prisma.trip.create({
      data: {
        vehicleId: vehicle.id,
        employeeId: employee.id,
        driver: employee.name,
        department: employee.department,
        origin,
        destination,
        mileageStart,
        photoStart,
        selfie,
        warnings: warnings.join("\n") || null,
      },
    });
  } catch (e) {
    // อีกเครื่องบันทึกออกเดินทางรถคันนี้ไปก่อนในจังหวะเดียวกัน
    await deletePhotos([selfie, photoStart]);
    if (isUniqueViolation(e)) return { error: "รถคันนี้เพิ่งมีคนบันทึกออกเดินทางไปแล้ว กรุณารีเฟรชหน้า" };
    throw e;
  }
  await purgeOldSelfies().catch(() => {});
  redirect(`/v/${code}/done?t=start`);
}

export async function endTrip(code: string, _prev: FormState, form: FormData): Promise<FormState> {
  const vehicle = await getVehicleByCode(code);
  if (!vehicle) return { error: "ไม่พบรถคันนี้" };
  const trip = await getOpenTrip(vehicle.id);
  if (!trip) return { error: "ไม่พบรายการที่ยังไม่คืนรถ กรุณารีเฟรชหน้า" };

  const mileageEnd = mileage(form, "mileageEnd");
  if (mileageEnd === null) return { error: "เลขไมล์ไม่ถูกต้อง" };
  if (!hasFile(form.get("photo"))) return { error: "กรุณาถ่ายรูปหน้าปัดเลขไมล์" };
  if (mileageEnd < trip.mileageStart) {
    return { error: `เลขไมล์หลังเดินทางต้องไม่น้อยกว่าเลขไมล์ก่อนเดินทาง (${km(trip.mileageStart)})` };
  }
  const distance = mileageEnd - trip.mileageStart;
  const warning = distance > MAX_TRIP_KM ? `ระยะทางทริปนี้ ${km(distance)} กม. ซึ่งมากผิดปกติ` : null;
  if (warning && form.get("confirm") !== "1") return { warning };

  let photoEnd: string | null;
  try {
    photoEnd = await savePhoto(form.get("photo"));
  } catch (e) {
    return { error: (e as Error).message };
  }

  // คืนได้ครั้งเดียว — ถ้าอีกเครื่องคืนไปก่อนแล้ว ไม่เขียนทับเลขไมล์ของเขา
  const { count } = await prisma.trip.updateMany({
    where: { id: trip.id, mileageEnd: null },
    data: {
      mileageEnd,
      returnedAt: new Date(),
      photoEnd,
      warnings: [trip.warnings, warning].filter(Boolean).join("\n") || null,
    },
  });
  if (count === 0) {
    await deletePhotos([photoEnd]);
    return { error: "รายการนี้เพิ่งมีคนบันทึกคืนรถไปแล้ว กรุณารีเฟรชหน้า" };
  }
  redirect(`/v/${code}/done?t=end&km=${distance}`);
}
