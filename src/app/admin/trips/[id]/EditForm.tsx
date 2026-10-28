"use client";

import { useActionState } from "react";
import { deleteTrip, updateTrip } from "./actions";

type TripValues = {
  id: string;
  driver: string;
  department: string;
  origin: string;
  destination: string;
  departedAt: string;
  returnedAt: string;
  mileageStart: number;
  mileageEnd: number | null;
  warnings: string | null;
};

const input = "w-full rounded border border-gray-300 px-2 py-2";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-gray-600">{label}</span>
      {children}
    </label>
  );
}

export default function EditForm({ trip }: { trip: TripValues }) {
  const [state, action, pending] = useActionState(updateTrip.bind(null, trip.id), {});

  return (
    <>
      <form action={action} className="grid gap-3 sm:grid-cols-2">
        <Field label="ผู้ใช้รถ">
          <input name="driver" defaultValue={trip.driver} required className={input} />
        </Field>
        <Field label="แผนก">
          <input name="department" defaultValue={trip.department} required className={input} />
        </Field>
        <Field label="ออกเดินทางจาก">
          <input name="origin" defaultValue={trip.origin} required className={input} />
        </Field>
        <Field label="สถานที่ไป">
          <input name="destination" defaultValue={trip.destination} required className={input} />
        </Field>
        <Field label="วันที่/เวลาออก">
          <input type="datetime-local" name="departedAt" defaultValue={trip.departedAt} required className={input} />
        </Field>
        <Field label="วันที่/เวลาคืนรถ (เว้นว่าง = ยังไม่คืน)">
          <input type="datetime-local" name="returnedAt" defaultValue={trip.returnedAt} className={input} />
        </Field>
        <Field label="เลขไมล์ก่อนเดินทาง">
          <input name="mileageStart" inputMode="numeric" defaultValue={trip.mileageStart} required className={input} />
        </Field>
        <Field label="เลขไมล์หลังเดินทาง (เว้นว่าง = ยังไม่คืน)">
          <input name="mileageEnd" inputMode="numeric" defaultValue={trip.mileageEnd ?? ""} className={input} />
        </Field>
        {trip.warnings && (
          <div className="whitespace-pre-line rounded bg-orange-50 p-3 text-sm text-orange-800 sm:col-span-2">
            ⚠️ {trip.warnings}
            <label className="mt-2 flex items-center gap-2">
              <input type="checkbox" name="clearWarnings" /> ตรวจแล้ว ล้างคำเตือน
            </label>
          </div>
        )}
        {state.error && <p className="text-red-600 sm:col-span-2">{state.error}</p>}
        <button disabled={pending} className="rounded bg-blue-600 py-2 font-bold text-white sm:col-span-2">
          บันทึกการแก้ไข
        </button>
      </form>
      <form
        action={deleteTrip.bind(null, trip.id)}
        onSubmit={(e) => {
          if (!confirm("ลบรายการนี้และรูปทั้งหมด? ย้อนกลับไม่ได้")) e.preventDefault();
        }}
        className="mt-6 border-t pt-4"
      >
        <button className="rounded border border-red-300 px-4 py-2 text-red-600">ลบรายการนี้</button>
      </form>
    </>
  );
}
