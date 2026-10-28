import Link from "next/link";
import { notFound } from "next/navigation";
import { currentMonth, formatDate, formatReturn, formatTime, monthLabel } from "@/lib/format";
import { getTripsForMonth, getVehicleByCode } from "@/lib/trips";

export const dynamic = "force-dynamic";

const th = "border border-gray-800 px-2 py-1 font-bold";
const td = "border border-gray-800 px-2 py-1";

function PhotoLink({ name, label }: { name: string; label: string }) {
  return (
    <a href={`/api/photos/${name}`} target="_blank" className="mx-0.5 inline-block text-center text-xs text-blue-600">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/photos/${name}`} alt={label} className="h-10 w-10 rounded object-cover" />
      {label}
    </a>
  );
}

export default async function VehicleLogPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { code } = await params;
  const { month: m } = await searchParams;
  const month = m && /^\d{4}-\d{2}$/.test(m) ? m : currentMonth();

  const vehicle = await getVehicleByCode(code);
  if (!vehicle) notFound();
  const trips = await getTripsForMonth(vehicle.id, month);
  const totalKm = trips.reduce((sum, t) => sum + (t.mileageEnd !== null ? t.mileageEnd - t.mileageStart : 0), 0);

  return (
    <main className="mx-auto max-w-6xl p-4">
      <div className="no-print mb-4 flex flex-wrap items-center gap-3">
        <Link href="/admin" className="text-blue-600">
          ← กลับ
        </Link>
        <form className="flex gap-2">
          <input type="month" name="month" defaultValue={month} className="rounded border px-2 py-1" />
          <button className="rounded border px-3 py-1">ดู</button>
        </form>
        <a href={`/api/export/${code}?month=${month}`} className="rounded-lg bg-green-600 px-4 py-2 text-white">
          ดาวน์โหลด Excel
        </a>
        <a href={`/v/${code}`} className="rounded-lg border px-4 py-2" target="_blank">
          เปิดหน้าสแกน
        </a>
      </div>

      <div className="overflow-x-auto bg-white p-4">
        <h1 className="text-center text-xl font-bold">ตารางรายละเอียดการเดินทางและการใช้รถ</h1>
        <div className="mb-2 flex justify-between">
          <span>ประจำเดือน {monthLabel(month)}</span>
          <span className="bg-yellow-300 px-3 font-bold">ทะเบียนรถ {vehicle.plate}</span>
        </div>
        <table className="w-full border-collapse text-center text-sm">
          <thead>
            <tr>
              <th rowSpan={2} className={th}>วันที่</th>
              <th colSpan={2} className={th}>สถานที่ออกเดินทาง</th>
              <th rowSpan={2} className={th}>ผู้ใช้รถ</th>
              <th rowSpan={2} className={th}>แผนก</th>
              <th rowSpan={2} className={th}>สถานที่ไป</th>
              <th rowSpan={2} className={th}>เวลา<br />คืนรถ</th>
              <th colSpan={2} className={th}>เลขไมล์</th>
              <th rowSpan={2} className={th}>ระยะทาง<br />รวม/กม.</th>
              <th rowSpan={2} className={`${th} no-print`}>รูป</th>
            </tr>
            <tr>
              <th className={th}>ออกเดินทางจาก</th>
              <th className={th}>เวลา</th>
              <th className={th}>เลขไมล์<br />ก่อนเดินทาง</th>
              <th className={th}>เลขไมล์หลัง<br />เดินทาง</th>
            </tr>
          </thead>
          <tbody>
            {trips.length === 0 && (
              <tr>
                <td colSpan={11} className={`${td} py-6 text-gray-400`}>ไม่มีรายการในเดือนนี้</td>
              </tr>
            )}
            {trips.map((t) => (
              <tr key={t.id}>
                <td className={td}>{formatDate(t.departedAt)}</td>
                <td className={td}>{t.origin}</td>
                <td className={td}>{formatTime(t.departedAt)}</td>
                <td className={td}>{t.driver}</td>
                <td className={td}>{t.department}</td>
                <td className={td}>{t.destination}</td>
                <td className={td}>{formatReturn(t.departedAt, t.returnedAt)}</td>
                <td className={td}>{t.mileageStart.toLocaleString()}</td>
                <td className={td}>{t.mileageEnd?.toLocaleString() ?? <span className="text-orange-600">ยังไม่คืนรถ</span>}</td>
                <td className={td}>{t.mileageEnd !== null ? (t.mileageEnd - t.mileageStart).toLocaleString() : "-"}</td>
                <td className={`${td} no-print whitespace-nowrap`}>
                  {t.photoStart && <PhotoLink name={t.photoStart} label="ออก" />}
                  {t.photoEnd && <PhotoLink name={t.photoEnd} label="คืน" />}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={9} className={`${td} text-right font-bold`}>รวม</td>
              <td className={`${td} font-bold`}>{totalKm.toLocaleString()}</td>
              <td className={`${td} no-print`} />
            </tr>
          </tfoot>
        </table>
      </div>
    </main>
  );
}
