import Link from "next/link";
import CategoryTabs from "@/components/CategoryTabs";
import VehicleBoard from "./VehicleBoard";
import { prisma } from "@/lib/db";
import { logout } from "@/lib/auth";
import { formatDate, formatTime } from "@/lib/format";
import { purgeOldSelfies } from "@/lib/photos";
import { categoryFromParam, categoryKey, getGroups, vehicleOrder } from "@/lib/vehicles";

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ type?: string; select?: string }> }) {
  const q = await searchParams;
  const category = categoryFromParam(q.type);
  const selecting = q.select === "1";
  const type = categoryKey(category);
  const inCategory = { group: { category } };

  const [groups, vehicles, employeeCount, flagged] = await Promise.all([
    getGroups(),
    prisma.vehicle.findMany({
      where: inCategory,
      orderBy: vehicleOrder,
      include: { trips: { orderBy: { departedAt: "desc" }, take: 1 } },
    }),
    prisma.employee.count({ where: { active: true } }),
    prisma.trip.findMany({
      where: { warnings: { not: null }, vehicle: inCategory },
      include: { vehicle: true },
      orderBy: { departedAt: "desc" },
    }),
  ]);
  await purgeOldSelfies().catch(() => {});

  return (
    <main className="mx-auto max-w-4xl p-4">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">ระบบบันทึกการใช้รถ</h1>
        <div className="flex flex-wrap gap-3">
          {/* กดแล้วการ์ดรถมีช่องติ๊ก เลือกรถแล้วกด "ดูรายงาน" — กดอีกครั้งเพื่อยกเลิก */}
          <Link
            href={selecting ? `/admin?type=${type}` : `/admin?type=${type}&select=1`}
            aria-pressed={selecting}
            className={`rounded-lg border px-4 py-2 ${selecting ? "border-blue-600 bg-blue-600 text-white" : ""}`}
          >
            รายงาน
          </Link>
          <Link href={`/admin/vehicles?type=${type}`} className="rounded-lg border px-4 py-2">
            รถ
          </Link>
          <Link href="/admin/employees" className="rounded-lg border px-4 py-2">
            พนักงาน
          </Link>
          <Link href={`/admin/qr?type=${type}`} className="rounded-lg bg-gray-900 px-4 py-2 text-white">
            พิมพ์ QR Code
          </Link>
          <form action={logout}>
            <button className="rounded-lg border px-4 py-2">ออกจากระบบ</button>
          </form>
        </div>
      </header>

      <CategoryTabs path="/admin" current={category} />

      {employeeCount === 0 && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">
          ยังไม่มีพนักงานในระบบ จึงยังยืมรถไม่ได้ — <Link href="/admin/employees" className="underline">เพิ่มพนักงาน</Link>
        </p>
      )}
      {flagged.length > 0 && (
        <section className="mb-4 rounded-lg bg-orange-50 p-3 text-orange-900">
          <h2 className="font-bold">⚠️ รายการที่ต้องตรวจสอบ ({flagged.length})</h2>
          <ul className="mt-1 space-y-1 text-sm">
            {flagged.map((t) => (
              <li key={t.id}>
                <Link href={`/admin/trips/${t.id}`} className="underline">
                  {t.vehicle.plate} · {formatDate(t.departedAt)} · {t.driver}
                </Link>{" "}
                — {t.warnings?.split("\n")[0]}
              </li>
            ))}
          </ul>
        </section>
      )}

      {vehicles.length === 0 && (
        <p className="rounded-xl bg-white p-6 text-center text-gray-500">
          ยังไม่มีรถประเภทนี้ — <Link href={`/admin/vehicles?type=${type}`} className="text-blue-600 underline">เพิ่มรถ</Link>
        </p>
      )}
      <VehicleBoard
        key={`${type}${selecting}`}
        selecting={selecting}
        cancelHref={`/admin?type=${type}`}
        groups={groups
          .filter((g) => g.category === category)
          .map((g) => ({
            id: g.id,
            name: g.name,
            vehicles: vehicles
              .filter((v) => v.groupId === g.id)
              .map((v) => {
                const last = v.trips[0];
                const inUse = !!last && last.mileageEnd === null;
                return {
                  code: v.code,
                  plate: v.plate,
                  inUse,
                  line: last
                    ? inUse
                      ? `${last.driver}${last.department ? ` (${last.department})` : ""} → ${last.destination} (ออก ${formatDate(last.departedAt)} ${formatTime(last.departedAt)})`
                      : `ใช้ล่าสุด ${formatDate(last.departedAt)} · ไมล์ ${last.mileageEnd?.toLocaleString()}`
                    : "ยังไม่มีการใช้งาน",
                };
              }),
          }))
          .filter((g) => g.vehicles.length > 0)}
      />
    </main>
  );
}
