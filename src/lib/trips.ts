import { prisma } from "./db";

export function getVehicleByCode(code: string) {
  return prisma.vehicle.findUnique({ where: { code }, include: { group: true } });
}

// ทริปที่ยังไม่คืนรถ (ยังไม่ได้กรอกเลขไมล์หลังเดินทาง)
export function getOpenTrip(vehicleId: string) {
  return prisma.trip.findFirst({
    where: { vehicleId, mileageEnd: null },
    orderBy: { departedAt: "desc" },
  });
}

// เลขไมล์ล่าสุดที่รู้ ใช้ตรวจว่าเลขไมล์ที่กรอกถอยหลังหรือกระโดดผิดปกติ
export async function getLastMileage(vehicleId: string) {
  const last = await prisma.trip.findFirst({
    where: { vehicleId, mileageEnd: { not: null } },
    orderBy: { returnedAt: "desc" },
  });
  return last?.mileageEnd ?? null;
}

type Range = { start: Date; end: Date };

// รายการที่ออกเดินทางในช่วง [start, end)
export function getTripsInRange(vehicleId: string, { start, end }: Range) {
  return prisma.trip.findMany({
    where: { vehicleId, departedAt: { gte: start, lt: end } },
    orderBy: { departedAt: "asc" },
  });
}

// การเติมน้ำมันตามวันที่บนบิลในช่วง [start, end) — บิลที่บันทึกช้าก็ยังนับเข้าเดือนของบิล
export function getFuelInRange(vehicleIds: string[], { start, end }: Range) {
  return prisma.fuelLog.findMany({
    where: { vehicleId: { in: vehicleIds }, billDate: { gte: start, lt: end } },
    include: { vehicle: true },
    orderBy: [{ billDate: "asc" }, { createdAt: "asc" }],
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
