import Link from "next/link";
import { notFound } from "next/navigation";
import FuelSection from "@/components/FuelSection";
import PeriodForm from "@/components/PeriodForm";
import TripTable from "@/components/TripTable";
import { periodLabel, resolvePeriod } from "@/lib/format";
import { getFuelInRange, getTripsInRange, getVehicleByCode } from "@/lib/trips";
import { categoryKey, categoryLabel } from "@/lib/vehicles";

export const dynamic = "force-dynamic";

export default async function VehicleLogPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ month?: string; from?: string; to?: string }>;
}) {
  const { code } = await params;
  const period = resolvePeriod(await searchParams);

  const vehicle = await getVehicleByCode(code);
  if (!vehicle) notFound();
  const trips = await getTripsInRange(vehicle.id, period);
  const fuel = await getFuelInRange([vehicle.id], period);

  return (
    <main className="mx-auto max-w-6xl p-4">
      <div className="no-print mb-4 flex flex-wrap items-center gap-3">
        <Link href={`/admin?type=${categoryKey(vehicle.group.category)}`} className="text-blue-600">
          ← กลับ
        </Link>
        <PeriodForm period={period} />
        <a
          href={`/api/export/${code}?from=${period.from}&to=${period.to}`}
          className="rounded-lg bg-green-600 px-4 py-2 text-white"
        >
          ดาวน์โหลด Excel
        </a>
        <a href={`/v/${code}`} className="rounded-lg border px-4 py-2" target="_blank">
          เปิดหน้าสแกน
        </a>
        <a href={`/f/${code}`} className="rounded-lg border px-4 py-2" target="_blank">
          เปิดหน้าเติมน้ำมัน
        </a>
      </div>

      <div className="overflow-x-auto bg-white p-4">
        <h1 className="text-center text-xl font-bold">ตารางรายละเอียดการเดินทางและการใช้รถ</h1>
        <div className="mb-2 flex justify-between">
          <span>{periodLabel(period)}</span>
          <span className="bg-yellow-300 px-3 font-bold">ทะเบียนรถ {vehicle.plate}</span>
        </div>
        <TripTable trips={trips} />
        <p className="no-print mt-2 text-xs text-gray-500">
          {categoryLabel(vehicle.group.category)} · กลุ่ม{vehicle.group.name}
        </p>
      </div>

      <FuelSection id="fuel" className="mt-6" plate={vehicle.plate} period={period} rows={fuel} />
    </main>
  );
}
