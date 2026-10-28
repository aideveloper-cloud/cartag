import { prisma } from "./db";
import { monthRange } from "./format";

export function getVehicleByCode(code: string) {
  return prisma.vehicle.findUnique({ where: { code } });
}

// ทริปที่ยังไม่คืนรถ (ยังไม่ได้กรอกเลขไมล์หลังเดินทาง)
export function getOpenTrip(vehicleId: string) {
  return prisma.trip.findFirst({
    where: { vehicleId, mileageEnd: null },
    orderBy: { departedAt: "desc" },
  });
}

// เลขไมล์ล่าสุดที่รู้ เพื่อเติมให้อัตโนมัติในช่อง "เลขไมล์ก่อนเดินทาง"
export async function getLastMileage(vehicleId: string) {
  const last = await prisma.trip.findFirst({
    where: { vehicleId, mileageEnd: { not: null } },
    orderBy: { returnedAt: "desc" },
  });
  return last?.mileageEnd ?? null;
}

export function getTripsForMonth(vehicleId: string, month: string) {
  const { start, end } = monthRange(month);
  return prisma.trip.findMany({
    where: { vehicleId, departedAt: { gte: start, lt: end } },
    orderBy: { departedAt: "asc" },
  });
}

export function findActiveEmployee(code: string) {
  return prisma.employee.findFirst({ where: { code: code.trim().toUpperCase(), active: true } });
}

// แผนกที่มีอยู่ ใช้เป็นตัวเลือกในฟอร์มพนักงาน
export async function getDepartments() {
  const rows = await prisma.employee.findMany({
    distinct: ["department"],
    select: { department: true },
    orderBy: { department: "asc" },
  });
  return rows.map((r) => r.department);
}
