"use client";

import { useActionState } from "react";
import { deleteFuel, updateFuel } from "../actions";

type FuelValues = {
  id: string;
  driver: string;
  department: string;
  billDate: string; // YYYY-MM-DD
  amount: string;
  liters: string;
  mileage: number;
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

// แบบเดียวกับหน้าแก้ไขรายการใช้รถ: ฟอร์มแก้ทุกช่อง + ปุ่มลบด้านล่าง
export default function EditForm({ fuel, today }: { fuel: FuelValues; today: string }) {
  const [state, action, pending] = useActionState(updateFuel.bind(null, fuel.id), {});

  return (
    <>
      <form action={action} className="grid gap-3 sm:grid-cols-2">
        <Field label="ผู้เติม">
          <input name="driver" defaultValue={fuel.driver} required className={input} />
        </Field>
        <Field label="แผนก">
          <input name="department" defaultValue={fuel.department} required className={input} />
        </Field>
        <Field label="วันที่บนบิล">
          <input type="date" name="billDate" defaultValue={fuel.billDate} max={today} required className={input} />
        </Field>
        <Field label="เลขไมล์ตอนเติม">
          <input name="mileage" inputMode="numeric" defaultValue={fuel.mileage} required className={input} />
        </Field>
        <Field label="จำนวนลิตร">
          <input name="liters" inputMode="decimal" defaultValue={fuel.liters} required className={input} />
        </Field>
        <Field label="จำนวนเงิน (บาท)">
          <input name="amount" inputMode="decimal" defaultValue={fuel.amount} required className={input} />
        </Field>
        {state.error && <p className="text-red-600 sm:col-span-2">{state.error}</p>}
        <button disabled={pending} className="rounded bg-blue-600 py-2 font-bold text-white sm:col-span-2">
          บันทึกการแก้ไข
        </button>
      </form>
      <form
        action={deleteFuel.bind(null, fuel.id)}
        onSubmit={(e) => {
          if (!confirm("ลบรายการเติมน้ำมันนี้และรูปทั้งหมด? ย้อนกลับไม่ได้")) e.preventDefault();
        }}
        className="mt-6 border-t pt-4"
      >
        <button className="rounded border border-red-300 px-4 py-2 text-red-600">ลบรายการนี้</button>
      </form>
    </>
  );
}
