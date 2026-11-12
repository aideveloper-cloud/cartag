"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/admin";
import { isUniqueViolation, prisma } from "@/lib/db";

export type VehicleState = { error?: string; ok?: string };

// "2  ฒพ 2523 " → "2 ฒพ 2523"
const cleanPlate = (v: FormDataEntryValue | null) => String(v ?? "").trim().replace(/\s+/g, " ");

function refresh() {
  revalidatePath("/admin/vehicles");
  revalidatePath("/admin");
}

// กลุ่มที่เลือกต้องมีอยู่จริง
async function groupFrom(form: FormData) {
  const id = String(form.get("groupId") ?? "");
  return id ? prisma.vehicleGroup.findUnique({ where: { id } }) : null;
}

// รหัสใน QR จาก sequence ใน DB (v6, v7, ...) — ไม่ใช้เลขซ้ำแม้รถคันเดิมถูกลบ เพราะ QR เก่าอาจยังติดอยู่
async function nextCode() {
  const [{ n }] = await prisma.$queryRaw<{ n: bigint }[]>`SELECT nextval('vehicle_code_seq') AS n`;
  return `v${n}`;
}

export async function addVehicle(_prev: VehicleState, form: FormData): Promise<VehicleState> {
  await assertAdmin();
  const plate = cleanPlate(form.get("plate"));
  if (!plate) return { error: "กรอกทะเบียนรถ" };
  const group = await groupFrom(form);
  if (!group) return { error: "เลือกกลุ่มรถ" };
  if (await prisma.vehicle.findUnique({ where: { plate } })) return { error: `ทะเบียน ${plate} มีอยู่แล้ว` };
  // ชน unique: ทะเบียนเดียวกันถูกเพิ่มพร้อมกัน (ตอบว่ามีแล้ว) หรือรหัสชนกับที่มีอยู่ (ลองเลขถัดไป)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const v = await prisma.vehicle.create({ data: { plate, code: await nextCode(), groupId: group.id } });
      refresh();
      return { ok: `เพิ่ม ${plate} แล้ว (รหัส QR ${v.code}) — พิมพ์ QR ได้ที่หน้าพิมพ์ QR Code` };
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
      if (await prisma.vehicle.findUnique({ where: { plate } })) return { error: `ทะเบียน ${plate} มีอยู่แล้ว` };
    }
  }
  return { error: "เพิ่มรถไม่สำเร็จ ลองใหม่อีกครั้ง" };
}

// แก้ทะเบียน/ย้ายกลุ่มได้โดยไม่ต้องพิมพ์ QR ใหม่ (QR ชี้ที่รหัส ไม่ใช่ทะเบียน)
export async function updateVehicle(id: string, _prev: VehicleState, form: FormData): Promise<VehicleState> {
  await assertAdmin();
  const plate = cleanPlate(form.get("plate"));
  if (!plate) return { error: "กรอกทะเบียนรถ" };
  const group = await groupFrom(form);
  if (!group) return { error: "เลือกกลุ่มรถ" };
  try {
    await prisma.vehicle.update({ where: { id }, data: { plate, groupId: group.id } });
  } catch (e) {
    if (isUniqueViolation(e)) return { error: `ทะเบียน ${plate} มีอยู่แล้ว` };
    throw e;
  }
  refresh();
  return { ok: "บันทึกแล้ว" };
}

// ลบได้เฉพาะรถที่ยังไม่มีประวัติการใช้ (กันประวัติและรายงานย้อนหลังหาย)
export async function deleteVehicle(id: string): Promise<VehicleState> {
  await assertAdmin();
  const trips = (await prisma.trip.count({ where: { vehicleId: id } })) + (await prisma.fuelLog.count({ where: { vehicleId: id } }));
  if (trips > 0) return { error: `ลบไม่ได้ — รถคันนี้มีประวัติการใช้ ${trips} รายการ` };
  await prisma.vehicle.delete({ where: { id } });
  refresh();
  return {};
}
