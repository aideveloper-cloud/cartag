import Link from "next/link";
import CategoryTabs from "@/components/CategoryTabs";
import { prisma } from "@/lib/db";
import { categoryFromParam, categoryKey, categoryLabel, getGroups, vehicleOrder } from "@/lib/vehicles";
import { AddVehicleForm, VehicleRow } from "./Forms";

export const dynamic = "force-dynamic";

export default async function VehiclesPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const category = categoryFromParam((await searchParams).type);
  const type = categoryKey(category);
  const [allGroups, vehicles] = await Promise.all([
    getGroups(),
    prisma.vehicle.findMany({
      where: { group: { category } },
      orderBy: vehicleOrder,
      include: { _count: { select: { trips: true, fuelLogs: true } } },
    }),
  ]);
  // ย้ายรถข้ามประเภทได้ (เลือกกลุ่มของอีกประเภท) — ตัวเลือกกลุ่มจึงมีครบทุกกลุ่ม
  const groups = allGroups.map((g) => ({ id: g.id, name: g.name, category: categoryLabel(g.category) }));
  const defaultGroup = allGroups.find((g) => g.category === category)?.id ?? "";

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <Link href={`/admin?type=${type}`} className="text-blue-600">
        ← กลับ
      </Link>
      <h1 className="text-2xl font-bold">รถ ({vehicles.length} คัน)</h1>
      <CategoryTabs path="/admin/vehicles" current={category} />

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-bold">เพิ่ม{categoryLabel(category)}</h2>
        <AddVehicleForm groups={groups} defaultGroup={defaultGroup} />
        <p className="mt-2 text-sm text-gray-500">
          เพิ่มแล้วไปที่ <Link href={`/admin/qr?type=${type}`} className="text-blue-600">พิมพ์ QR Code</Link> เพื่อพิมพ์ QR ติดรถ
        </p>
      </section>

      <section className="overflow-x-auto rounded-xl bg-white p-4 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">รหัส QR</th>
              <th>ทะเบียน / กลุ่ม</th>
              <th className="text-center">ใช้งาน (ครั้ง)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <VehicleRow
                key={v.id}
                id={v.id}
                plate={v.plate}
                code={v.code}
                groupId={v.groupId}
                groups={groups}
                trips={v._count.trips + v._count.fuelLogs}
              />
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-gray-500">
          แก้ทะเบียน/ย้ายกลุ่มได้โดยไม่ต้องพิมพ์ QR ใหม่ · ย้ายไปกลุ่มของอีกประเภทแล้วรถจะไปอยู่ในแท็บนั้น · ลบได้เฉพาะรถที่ยังไม่มีประวัติการใช้
        </p>
      </section>
    </main>
  );
}
