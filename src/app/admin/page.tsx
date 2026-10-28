import Link from "next/link";
import { prisma } from "@/lib/db";
import { logout } from "@/lib/auth";
import { formatDate, formatTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const vehicles = await prisma.vehicle.findMany({
    orderBy: { code: "asc" },
    include: { trips: { orderBy: { departedAt: "desc" }, take: 1 } },
  });

  return (
    <main className="mx-auto max-w-4xl p-4">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">ระบบบันทึกการใช้รถ</h1>
        <div className="flex gap-3">
          <Link href="/admin/qr" className="rounded-lg bg-gray-900 px-4 py-2 text-white">
            พิมพ์ QR Code
          </Link>
          <form action={logout}>
            <button className="rounded-lg border px-4 py-2">ออกจากระบบ</button>
          </form>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {vehicles.map((v) => {
          const last = v.trips[0];
          const inUse = last && last.mileageEnd === null;
          return (
            <Link
              key={v.id}
              href={`/admin/vehicles/${v.code}`}
              className="rounded-xl bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold">{v.plate}</span>
                <span
                  className={`rounded-full px-3 py-1 text-sm ${inUse ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}
                >
                  {inUse ? "กำลังใช้งาน" : "ว่าง"}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {last
                  ? inUse
                    ? `${last.driver}${last.department ? ` (${last.department})` : ""} → ${last.destination} (ออก ${formatDate(last.departedAt)} ${formatTime(last.departedAt)})`
                    : `ใช้ล่าสุด ${formatDate(last.departedAt)} · ไมล์ ${last.mileageEnd?.toLocaleString()}`
                  : "ยังไม่มีการใช้งาน"}
              </p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
