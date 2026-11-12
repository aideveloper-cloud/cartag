import type { FuelLog } from "@prisma/client";
import Link from "next/link";
import { formatDate, formatTime, monthOf } from "@/lib/format";
import PhotoLink from "./PhotoLink";

const th = "border border-gray-800 px-2 py-1 font-bold";
const td = "border border-gray-800 px-2 py-1";
const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// บิลที่บันทึกคนละเดือนกับวันที่บนบิล (มาช้า/ข้ามเดือน)
export const lateBill = (f: Pick<FuelLog, "billDate" | "createdAt">) => monthOf(f.billDate) !== monthOf(f.createdAt);

export function fuelTotals(rows: Pick<FuelLog, "amount" | "liters">[]) {
  return {
    liters: rows.reduce((s, f) => s + Number(f.liters), 0),
    amount: rows.reduce((s, f) => s + Number(f.amount), 0),
  };
}

// ตารางการเติมน้ำมันของรถหนึ่งคัน (เรียงตามวันที่บนบิล) — ใช้ใน FuelSection
export default function FuelTable({ rows }: { rows: FuelLog[] }) {
  const total = fuelTotals(rows);
  return (
    <table data-table="fuel" className="w-full border-collapse text-center text-sm">
      <thead>
        <tr>
          <th className={th}>วันที่บนบิล</th>
          <th className={th}>บันทึกเมื่อ</th>
          <th className={th}>ผู้เติม</th>
          <th className={th}>แผนก</th>
          <th className={th}>ลิตร</th>
          <th className={th}>บาท</th>
          <th className={th}>เลขไมล์</th>
          <th className={`${th} no-print`}>รูป</th>
          <th className={`${th} no-print`} />
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr>
            <td colSpan={9} className={`${td} py-6 text-gray-400`}>ไม่มีการเติมน้ำมันในช่วงนี้</td>
          </tr>
        )}
        {rows.map((f) => (
          <tr key={f.id}>
            <td className={td}>{formatDate(f.billDate)}</td>
            <td className={td}>
              {formatDate(f.createdAt)} {formatTime(f.createdAt)}
              {lateBill(f) && <span className="ml-1 rounded bg-orange-100 px-1 text-xs text-orange-700">ข้ามเดือน</span>}
            </td>
            <td className={td}>{f.driver}</td>
            <td className={td}>{f.department}</td>
            <td className={td}>{money(Number(f.liters))}</td>
            <td className={td}>{money(Number(f.amount))}</td>
            <td className={td}>{f.mileage.toLocaleString()}</td>
            <td className={`${td} no-print whitespace-nowrap`}>
              <PhotoLink name={f.photoCar} label="รถ" />
              <PhotoLink name={f.photoMileage} label="ไมล์" />
              <PhotoLink name={f.photoLive} label="เติม" />
              <PhotoLink name={f.photoBill} label="บิล" />
            </td>
            <td className={`${td} no-print whitespace-nowrap`}>
              <Link href={`/admin/fuel/${f.id}`} className="text-blue-600">
                แก้ไข
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={4} className={`${td} text-right font-bold`}>รวม</td>
          <td className={`${td} font-bold`}>{money(total.liters)}</td>
          <td className={`${td} font-bold`}>{money(total.amount)}</td>
          <td className={td} />
          <td colSpan={2} className={`${td} no-print`} />
        </tr>
      </tfoot>
    </table>
  );
}
