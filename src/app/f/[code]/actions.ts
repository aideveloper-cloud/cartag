"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { dayStart, isDay, today } from "@/lib/format";
import { type FormState, decimal, hasFile, mileage, text } from "@/lib/form";
import { deletePhotos, savePhoto } from "@/lib/photos";
import { findActiveEmployee, getOpenTrip, getVehicleByCode } from "@/lib/trips";

const MAX_AMOUNT = 100_000; // บาทต่อบิล
const MAX_LITERS = 1_000;
const MAX_BILL_AGE_DAYS = 365;

// รูปที่ต้องแนบ 4 รูป (ชื่อช่องในฟอร์ม = ชื่อคอลัมน์ใน FuelLog) ตามลำดับในฟอร์ม
const PHOTOS = [
  ["photoCar", "กรุณาถ่ายรูปหน้ารถ"],
  ["photoMileage", "กรุณาถ่ายรูปเลขไมล์"],
  ["photoLive", "กรุณาถ่ายรูปตอนเติมน้ำมัน"],
  ["photoBill", "กรุณาแนบรูปบิล"],
] as const;

export async function saveFuel(code: string, _prev: FormState, form: FormData): Promise<FormState> {
  const vehicle = await getVehicleByCode(code);
  if (!vehicle) return { error: "ไม่พบรถคันนี้" };

  const employee = await findActiveEmployee(text(form, "employeeCode"));
  if (!employee) return { error: "ไม่พบรหัสพนักงานนี้ กรุณาติดต่อผู้ดูแลระบบ" };

  const billDay = text(form, "billDate");
  if (!isDay(billDay)) return { error: "วันที่บนบิลไม่ถูกต้อง" };
  if (billDay > today()) return { error: "วันที่บนบิลเป็นวันในอนาคต" };
  const billDate = dayStart(billDay);
  if (Date.now() - billDate.getTime() > MAX_BILL_AGE_DAYS * 86400_000) return { error: "บิลเก่าเกิน 1 ปี กรุณาติดต่อผู้ดูแลระบบ" };

  const amount = decimal(form, "amount", MAX_AMOUNT);
  if (amount === null) return { error: "จำนวนเงินไม่ถูกต้อง" };
  const liters = decimal(form, "liters", MAX_LITERS);
  if (liters === null) return { error: "จำนวนลิตรไม่ถูกต้อง" };
  const mileageAt = mileage(form, "mileage");
  if (mileageAt === null) return { error: "เลขไมล์ไม่ถูกต้อง" };

  for (const [key, missing] of PHOTOS) if (!hasFile(form.get(key))) return { error: missing };

  // บันทึกรูปทีละช่อง — ถ้าช่องไหนพัง ลบรูปที่บันทึกไปแล้วทิ้ง
  const saved: string[] = [];
  try {
    for (const [key] of PHOTOS) saved.push((await savePhoto(form.get(key)))!);
  } catch (e) {
    await deletePhotos(saved);
    return { error: (e as Error).message };
  }
  const [photoCar, photoMileage, photoLive, photoBill] = saved;

  const openTrip = await getOpenTrip(vehicle.id);
  try {
    await prisma.fuelLog.create({
      data: {
        vehicleId: vehicle.id,
        tripId: openTrip?.id ?? null,
        employeeId: employee.id,
        driver: employee.name,
        department: employee.department,
        billDate,
        amount,
        liters,
        mileage: mileageAt,
        photoCar,
        photoMileage,
        photoLive,
        photoBill,
      },
    });
  } catch (e) {
    await deletePhotos(saved);
    throw e;
  }
  redirect(`/f/${code}/done`);
}
