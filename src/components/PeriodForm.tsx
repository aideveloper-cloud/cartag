import { type Period, periodPresets } from "@/lib/format";
import PeriodSelect from "./PeriodSelect";

// ตัวเลือกช่วงเวลา (dropdown + ตั้งแต่–ถึง) เป็นฟอร์ม GET — children = ช่องอื่นที่ต้องส่งไปด้วย (เช่นรถที่ติ๊กไว้)
// key รีเซ็ตค่าในช่องเมื่อเปลี่ยนช่วง
export default function PeriodForm({ period, children }: { period: Period; children?: React.ReactNode }) {
  return (
    <form key={`${period.from}${period.to}`} className="flex flex-wrap items-center gap-2">
      {children}
      <PeriodSelect presets={periodPresets()} from={period.from} to={period.to} />
      <label className="text-sm text-gray-600" htmlFor="from">ตั้งแต่</label>
      <input id="from" type="date" name="from" required defaultValue={period.from} className="rounded border px-2 py-1" />
      <label className="text-sm text-gray-600" htmlFor="to">ถึง</label>
      <input id="to" type="date" name="to" required defaultValue={period.to} className="rounded border px-2 py-1" />
      <button className="rounded border px-3 py-1">ดู</button>
    </form>
  );
}
