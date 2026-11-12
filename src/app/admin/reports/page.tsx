import Link from "next/link";
import FuelSection from "@/components/FuelSection";
import PeriodSelect from "@/components/PeriodSelect";
import TripTable from "@/components/TripTable";
import { prisma } from "@/lib/db";
import { periodLabel, periodPresets } from "@/lib/format";
import { loadReport, reportQuery, reportSearch } from "@/lib/report";
import { categoryLabel, getGroups, vehicleOrder } from "@/lib/vehicles";
import VehiclePicker from "./VehiclePicker";

export const dynamic = "force-dynamic";

const th = "border border-gray-800 px-2 py-1 font-bold";
const td = "border border-gray-800 px-2 py-1";
const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// รีพอร์ต: เลือกกลุ่ม/หลายทะเบียน + ช่วงวันที่ → สรุป, ตารางการใช้รถแยกคัน, การเติมน้ำมัน, Excel ไฟล์เดียว
export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { codes, period } = reportQuery(await searchParams);
  const [groups, vehicles] = await Promise.all([getGroups(), prisma.vehicle.findMany({ orderBy: vehicleOrder })]);
  const pickerGroups = groups.map((g) => ({
    id: g.id,
    name: g.name,
    category: categoryLabel(g.category),
    vehicles: vehicles.filter((v) => v.groupId === g.id).map((v) => ({ code: v.code, plate: v.plate })),
  }));
  const report = codes.length ? await loadReport(codes, period) : null;
  const total = report?.summary.reduce(
    (s, r) => ({ trips: s.trips + r.trips, km: s.km + r.km, fills: s.fills + r.fills, liters: s.liters + r.liters, amount: s.amount + r.amount }),
    { trips: 0, km: 0, fills: 0, liters: 0, amount: 0 },
  );

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4">
      <Link href="/admin" className="no-print text-blue-600">
        ← กลับ
      </Link>
      <h1 className="text-2xl font-bold">รายงาน</h1>

      <form key={`${codes.join()}|${period.from}|${period.to}`} className="no-print space-y-3 rounded-xl bg-gray-50 p-4">
        {/* มาจากการติ๊กรถที่หน้าแรกแล้ว: ซ่อนรายการรถไว้ เปิดเพื่อเพิ่ม/ลดได้ (ช่องที่ซ่อนยังถูกส่ง) */}
        <details open={codes.length === 0}>
          <summary className="cursor-pointer font-medium">
            {report ? `รถที่เลือก ${report.vehicles.length} คัน: ${report.vehicles.map((v) => v.plate).join(", ")}` : "เลือกรถ"}
            {report && <span className="ml-2 text-sm text-blue-600 underline">เปลี่ยน</span>}
          </summary>
          <div className="mt-3">
            <VehiclePicker groups={pickerGroups} selected={codes} />
          </div>
        </details>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600">ช่วงเวลา</span>
          <PeriodSelect presets={periodPresets()} from={period.from} to={period.to} />
          <label className="text-sm text-gray-600" htmlFor="from">ตั้งแต่</label>
          <input id="from" type="date" name="from" required defaultValue={period.from} className="rounded border px-2 py-1" />
          <label className="text-sm text-gray-600" htmlFor="to">ถึง</label>
          <input id="to" type="date" name="to" required defaultValue={period.to} className="rounded border px-2 py-1" />
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-white">ดูรายงาน</button>
          {report && report.vehicles.length > 0 && (
            <a href={`/api/report?${reportSearch(codes, period)}`} className="rounded-lg bg-green-600 px-4 py-2 text-white">
              ดาวน์โหลด Excel
            </a>
          )}
        </div>
      </form>

      {!report && <p className="rounded-xl bg-white p-6 text-center text-gray-500">ติ๊กเลือกกลุ่มหรือทะเบียนรถ แล้วกด &quot;ดูรายงาน&quot;</p>}
      {report && report.vehicles.length === 0 && <p className="rounded-xl bg-white p-6 text-center text-gray-500">ไม่พบรถที่เลือก</p>}

      {report && report.vehicles.length > 0 && total && (
        <>
          <section className="overflow-x-auto bg-white p-4">
            <h2 className="text-center text-xl font-bold">สรุปการใช้รถ</h2>
            <p className="mb-2">{periodLabel(period)}</p>
            <table className="w-full border-collapse text-center text-sm">
              <thead>
                <tr>
                  <th className={th}>ทะเบียน</th>
                  <th className={th}>กลุ่ม</th>
                  <th className={th}>ใช้รถ (ครั้ง)</th>
                  <th className={th}>ระยะทาง (กม.)</th>
                  <th className={th}>เติมน้ำมัน (ครั้ง)</th>
                  <th className={th}>ลิตร</th>
                  <th className={th}>บาท</th>
                </tr>
              </thead>
              <tbody>
                {report.summary.map((r) => (
                  <tr key={r.plate}>
                    <td className={td}>{r.plate}</td>
                    <td className={td}>{r.group}</td>
                    <td className={td}>{r.trips.toLocaleString()}</td>
                    <td className={td}>{r.km.toLocaleString()}</td>
                    <td className={td}>{r.fills.toLocaleString()}</td>
                    <td className={td}>{money(r.liters)}</td>
                    <td className={td}>{money(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td colSpan={2} className={`${td} text-right`}>รวม {report.summary.length} คัน</td>
                  <td className={td}>{total.trips.toLocaleString()}</td>
                  <td className={td}>{total.km.toLocaleString()}</td>
                  <td className={td}>{total.fills.toLocaleString()}</td>
                  <td className={td}>{money(total.liters)}</td>
                  <td className={td}>{money(total.amount)}</td>
                </tr>
              </tfoot>
            </table>
          </section>

          {/* แต่ละคัน: ตารางการใช้รถ แล้วตามด้วยตารางการเติมน้ำมัน (หัวแบบเดียวกัน) */}
          {report.vehicles.map((v) => (
            <div key={v.id} className="break-before-page space-y-4">
              <section className="overflow-x-auto bg-white p-4">
                <h2 className="text-center text-xl font-bold">ตารางรายละเอียดการเดินทางและการใช้รถ</h2>
                <div className="mb-2 flex justify-between">
                  <span>{periodLabel(period)}</span>
                  <span className="bg-yellow-300 px-3 font-bold">ทะเบียนรถ {v.plate}</span>
                </div>
                <TripTable trips={v.trips} />
              </section>
              <FuelSection plate={v.plate} period={period} rows={report.fuel.filter((f) => f.vehicleId === v.id)} />
            </div>
          ))}
        </>
      )}
    </main>
  );
}
