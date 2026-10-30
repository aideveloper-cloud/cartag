import Link from "next/link";
import { prisma } from "@/lib/db";
import { AddVehicleForm, VehicleRow } from "./Forms";

export const dynamic = "force-dynamic";

export default async function VehiclesPage() {
  const vehicles = await prisma.vehicle.findMany({
    orderBy: [{ createdAt: "asc" }, { code: "asc" }],
    include: { _count: { select: { trips: true } } },
  });

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <Link href="/admin" className="text-blue-600">
        ← กลับ
      </Link>
      <h1 className="text-2xl font-bold">รถ ({vehicles.length} คัน)</h1>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-bold">เพิ่มรถ</h2>
        <AddVehicleForm />
        <p className="mt-2 text-sm text-gray-500">
          เพิ่มแล้วไปที่ <Link href="/admin/qr" className="text-blue-600">พิมพ์ QR Code</Link> เพื่อพิมพ์ QR ติดรถ
        </p>
      </section>

      <section className="overflow-x-auto rounded-xl bg-white p-4 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">รหัส QR</th>
              <th>ทะเบียน</th>
              <th className="text-center">ใช้งาน (ครั้ง)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <VehicleRow key={v.id} id={v.id} plate={v.plate} code={v.code} trips={v._count.trips} />
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-gray-500">
          แก้ทะเบียนได้โดยไม่ต้องพิมพ์ QR ใหม่ · ลบได้เฉพาะรถที่ยังไม่มีประวัติการใช้
        </p>
      </section>
    </main>
  );
}
