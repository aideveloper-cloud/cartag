"use server";

import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { dayStart, isDay, monthOf, today } from "@/lib/format";
import { decimal, mileage, text } from "@/lib/form";
import { deletePhotos } from "@/lib/photos";

export type FuelEditState = { error?: string };

// กลับไปหน้ารถ เดือนของวันที่บนบิล ที่ตารางเติมน้ำมัน
async function backToVehicle(vehicleId: string, billDate: Date): Promise<never> {
  const vehicle = await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId } });
  redirect(`/admin/vehicles/${vehicle.code}?month=${monthOf(billDate)}#fuel`);
}

export async function updateFuel(id: string, _prev: FuelEditState, form: FormData): Promise<FuelEditState> {
  await assertAdmin();
  const log = await prisma.fuelLog.findUnique({ where: { id } });
  if (!log) return { error: "ไม่พบรายการ" };

  const driver = text(form, "driver");
  const department = text(form, "department");
  const billDay = text(form, "billDate");
  const amount = decimal(form, "amount", 100_000);
  const liters = decimal(form, "liters", 1_000);
  const mileageAt = mileage(form, "mileage");

  if (!driver || !department) return { error: "กรอกข้อมูลให้ครบ" };
  if (!isDay(billDay)) return { error: "วันที่บนบิลไม่ถูกต้อง" };
  if (billDay > today()) return { error: "วันที่บนบิลเป็นวันในอนาคต" };
  if (amount === null) return { error: "จำนวนเงินไม่ถูกต้อง" };
  if (liters === null) return { error: "จำนวนลิตรไม่ถูกต้อง" };
  if (mileageAt === null) return { error: "เลขไมล์ไม่ถูกต้อง" };

  const billDate = dayStart(billDay);
  await prisma.fuelLog.update({
    where: { id },
    data: { driver, department, billDate, amount, liters, mileage: mileageAt },
  });
  return backToVehicle(log.vehicleId, billDate);
}

export async function deleteFuel(id: string) {
  await assertAdmin();
  const log = await prisma.fuelLog.delete({ where: { id } });
  await deletePhotos([log.photoCar, log.photoMileage, log.photoLive, log.photoBill]);
  return backToVehicle(log.vehicleId, log.billDate);
}
