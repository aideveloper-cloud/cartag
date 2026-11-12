import type { FuelLog } from "@prisma/client";
import { type Period, periodLabel } from "@/lib/format";
import FuelTable from "./FuelTable";

// ตารางการเติมน้ำมันของรถหนึ่งคัน — หัวแบบเดียวกับตารางการใช้รถ (ชื่อตาราง, ช่วงเวลา, ป้ายทะเบียน)
export default function FuelSection({
  plate,
  period,
  rows,
  id,
  className = "",
}: {
  plate: string;
  period: Period;
  rows: FuelLog[];
  id?: string;
  className?: string;
}) {
  return (
    <section id={id} className={`overflow-x-auto bg-white p-4 ${className}`}>
      <h2 className="text-center text-xl font-bold">ตารางการเติมน้ำมัน</h2>
      <div className="mb-2 flex justify-between">
        <span>{periodLabel(period)}</span>
        <span className="bg-yellow-300 px-3 font-bold">ทะเบียนรถ {plate}</span>
      </div>
      <FuelTable rows={rows} />
    </section>
  );
}
