import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { today } from "@/lib/format";
import { getOpenTrip, getVehicleByCode } from "@/lib/trips";
import FuelForm from "./FuelForm";

export const dynamic = "force-dynamic";

// หน้าจาก QR เติมน้ำมัน (รถทุกประเภท) — ทะเบียนมาจาก QR, ผู้เติมดึงจากรายการใช้รถที่ยังไม่คืน
export default async function FuelPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const vehicle = await getVehicleByCode(code);
  if (!vehicle) notFound();

  const openTrip = await getOpenTrip(vehicle.id);
  const employee = openTrip?.employeeId
    ? await prisma.employee.findFirst({ where: { id: openTrip.employeeId, active: true } })
    : null;

  return (
    <main className="mx-auto min-h-screen max-w-md p-4">
      <header className="mb-4 rounded-xl bg-emerald-200 p-4 text-center">
        <p className="text-sm text-gray-700">⛽ บันทึกเติมน้ำมัน · ทะเบียนรถ</p>
        <h1 className="text-3xl font-bold">{vehicle.plate}</h1>
        <p className="mt-1 text-sm text-gray-700">กลุ่ม{vehicle.group.name}</p>
      </header>

      <section className="rounded-xl bg-white p-5 shadow-sm">
        {openTrip && (
          <p className="mb-4 rounded-lg bg-gray-50 p-3 text-sm">
            ผู้ใช้รถตอนนี้: <b>{openTrip.driver}</b>
            {openTrip.department && ` · ${openTrip.department}`} → {openTrip.destination}
          </p>
        )}
        <FuelForm code={code} today={today()} employeeCode={employee?.code} />
      </section>
    </main>
  );
}
