"use client";

import { EmployeeInput, Feedback, PhotoInput, SubmitButton, input, label, useScanForm } from "@/components/ScanForm";
import { lookupEmployee } from "@/app/v/[code]/actions";
import { saveFuel } from "./actions";

export default function FuelForm({ code, today, employeeCode }: { code: string; today: string; employeeCode?: string }) {
  const f = useScanForm((prev, form) => saveFuel(code, prev, form));

  return (
    <form onSubmit={f.onSubmit} onChange={f.onChange} className="space-y-4">
      <EmployeeInput lookup={lookupEmployee} initialCode={employeeCode} />
      <div>
        <label className={label}>วันที่บนบิล</label>
        <input name="billDate" type="date" required max={today} defaultValue={today} className={input} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>จำนวนเงิน (บาท)</label>
          <input name="amount" required inputMode="decimal" pattern="[0-9,]*\.?[0-9]{0,2}" className={input} />
        </div>
        <div>
          <label className={label}>จำนวนลิตร</label>
          <input name="liters" required inputMode="decimal" pattern="[0-9,]*\.?[0-9]{0,2}" className={input} />
        </div>
      </div>
      <div>
        <label className={label}>เลขไมล์ตอนเติม</label>
        <input name="mileage" required inputMode="numeric" pattern="[0-9,]*" className={input} placeholder="ดูจากหน้าปัดรถ" />
      </div>
      {/* รูป 4 ช่อง วาง 2×2 ให้ฟอร์มไม่ยาวเกิน — ทุกช่องถ่ายใหม่หรือเลือกจากคลังรูปได้ (ไม่ใส่ capture) */}
      <div className="grid grid-cols-2 gap-3">
        <PhotoInput name="photoCar" title="รูปหน้ารถ" icon="🚗" required />
        <PhotoInput name="photoMileage" title="รูปเลขไมล์" required />
        <PhotoInput name="photoLive" title="รูปตอนเติมน้ำมัน" icon="⛽" required />
        <PhotoInput name="photoBill" title="รูปบิล" icon="🧾" required />
      </div>
      <Feedback state={f.state} confirming={f.confirming} />
      <SubmitButton pending={f.pending} confirming={f.confirming} text="บันทึกเติมน้ำมัน" color="bg-emerald-600" />
    </form>
  );
}
