import Link from "next/link";
import type { Trip } from "@prisma/client";
import { formatDate, formatReturn, formatTime } from "@/lib/format";
import PhotoLink from "./PhotoLink";

const th = "border border-gray-800 px-2 py-1 font-bold";
const td = "border border-gray-800 px-2 py-1";

export const tripKm = (trips: Pick<Trip, "mileageStart" | "mileageEnd">[]) =>
  trips.reduce((sum, t) => sum + (t.mileageEnd !== null ? t.mileageEnd - t.mileageStart : 0), 0);

// ตารางตามแบบฟอร์ม "ตารางรายละเอียดการเดินทางและการใช้รถ" (คอลัมน์รูป/แก้ไขไม่ถูกพิมพ์)
export default function TripTable({ trips }: { trips: Trip[] }) {
  return (
    <table data-table="trips" className="w-full border-collapse text-center text-sm">
      <thead>
        <tr>
          <th rowSpan={2} className={th}>วันที่</th>
          <th colSpan={2} className={`${th} text-xs`}>สถานที่ออกเดินทาง</th>
          <th rowSpan={2} className={`${th} min-w-44`}>ผู้ใช้รถ</th>
          <th rowSpan={2} className={th}>แผนก</th>
          <th rowSpan={2} className={th}>สถานที่ไป</th>
          <th rowSpan={2} className={th}>เวลา<br />คืนรถ</th>
          <th colSpan={2} className={th}>เลขไมล์</th>
          <th rowSpan={2} className={th}>ระยะทาง<br />รวม/กม.</th>
          <th rowSpan={2} className={`${th} no-print`}>รูป</th>
          <th rowSpan={2} className={`${th} no-print`} />
        </tr>
        <tr>
          <th className={`${th} w-24 text-xs`}>ออกเดินทางจาก</th>
          <th className={`${th} w-12 text-xs`}>เวลา</th>
          <th className={th}>เลขไมล์<br />ก่อนเดินทาง</th>
          <th className={th}>เลขไมล์หลัง<br />เดินทาง</th>
        </tr>
      </thead>
      <tbody>
        {trips.length === 0 && (
          <tr>
            <td colSpan={12} className={`${td} py-6 text-gray-400`}>ไม่มีรายการในช่วงนี้</td>
          </tr>
        )}
        {trips.map((t) => (
          <tr key={t.id} className={t.warnings ? "bg-orange-50" : ""} title={t.warnings ?? undefined}>
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
              {t.selfie && <PhotoLink name={t.selfie} label="หน้า" />}
              {t.photoStart && <PhotoLink name={t.photoStart} label="ออก" />}
              {t.photoEnd && <PhotoLink name={t.photoEnd} label="คืน" />}
            </td>
            <td className={`${td} no-print whitespace-nowrap`}>
              {t.warnings && <span className="mr-1" aria-label="มีคำเตือน">⚠️</span>}
              <Link href={`/admin/trips/${t.id}`} className="text-blue-600">
                แก้ไข
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={9} className={`${td} text-right font-bold`}>รวม</td>
          <td className={`${td} font-bold`}>{tripKm(trips).toLocaleString()}</td>
          <td colSpan={2} className={`${td} no-print`} />
        </tr>
      </tfoot>
    </table>
  );
}
