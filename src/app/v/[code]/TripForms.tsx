"use client";

import { EmployeeInput, Feedback, PhotoInput, SubmitButton, input, label, useScanForm } from "@/components/ScanForm";
import { endTrip, lookupEmployee, startTrip } from "./actions";

export function StartTripForm({ code }: { code: string }) {
  const f = useScanForm((prev, form) => startTrip(code, prev, form));

  return (
    <form onSubmit={f.onSubmit} onChange={f.onChange} className="space-y-4">
      <EmployeeInput lookup={lookupEmployee} />
      <div>
        <label className={label}>ออกเดินทางจาก</label>
        <input name="origin" required className={input} defaultValue="สำนักงาน" />
      </div>
      <div>
        <label className={label}>สถานที่ไป</label>
        <input name="destination" required className={input} />
      </div>
      <div>
        <label className={label}>เลขไมล์ก่อนเดินทาง</label>
        <input
          name="mileageStart"
          required
          inputMode="numeric"
          pattern="[0-9,]*"
          className={input}
          placeholder="ดูจากหน้าปัดรถ"
        />
      </div>
      <PhotoInput name="selfie" title="ถ่ายรูปหน้าผู้ยืมรถ" capture="user" required />
      <PhotoInput name="photo" title="รูปหน้าปัดเลขไมล์" capture="environment" required />
      <Feedback state={f.state} confirming={f.confirming} />
      <SubmitButton pending={f.pending} confirming={f.confirming} text="บันทึกออกเดินทาง" color="bg-blue-600" />
      <p className="text-xs text-gray-500">
        ข้อมูลและรูปถ่ายใช้เพื่อบันทึกการใช้รถของบริษัทเท่านั้น รูปหน้าผู้ยืมจะถูกลบอัตโนมัติเมื่อครบกำหนด
      </p>
    </form>
  );
}

export function EndTripForm({ code, mileageStart }: { code: string; mileageStart: number }) {
  const f = useScanForm((prev, form) => endTrip(code, prev, form));

  return (
    <form onSubmit={f.onSubmit} onChange={f.onChange} className="space-y-4">
      <div>
        <label className={label}>เลขไมล์หลังเดินทาง</label>
        <input
          name="mileageEnd"
          required
          inputMode="numeric"
          pattern="[0-9,]*"
          className={input}
          placeholder={`มากกว่าหรือเท่ากับ ${mileageStart.toLocaleString()}`}
          autoFocus
        />
      </div>
      <PhotoInput name="photo" title="รูปหน้าปัดเลขไมล์" capture="environment" required />
      <Feedback state={f.state} confirming={f.confirming} />
      <SubmitButton pending={f.pending} confirming={f.confirming} text="บันทึกคืนรถ" color="bg-green-600" />
    </form>
  );
}
