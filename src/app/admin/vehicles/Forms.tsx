"use client";

import { useActionState } from "react";
import { addVehicle, deleteVehicle, updateVehicle, type VehicleState } from "./actions";

const input = "rounded border border-gray-300 px-2 py-1";

function Result({ state }: { state: VehicleState }) {
  if (state.error) return <p className="text-sm text-red-600">{state.error}</p>;
  if (state.ok) return <p className="text-sm text-green-700">{state.ok}</p>;
  return null;
}

export function AddVehicleForm() {
  const [state, action, pending] = useActionState(addVehicle, {});
  return (
    <form action={action} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <input name="plate" placeholder="ทะเบียนรถ เช่น 1 กข 1234" required className={`${input} flex-1`} />
        <button disabled={pending} className="rounded bg-blue-600 px-4 py-1 text-white">
          เพิ่มรถ
        </button>
      </div>
      <Result state={state} />
    </form>
  );
}

export function VehicleRow({ id, plate, code, trips }: { id: string; plate: string; code: string; trips: number }) {
  const [saved, save, saving] = useActionState(updateVehicle.bind(null, id), {});
  const [removed, remove, removing] = useActionState(deleteVehicle.bind(null, id), {});
  return (
    <tr className="border-b align-top">
      <td className="py-1 font-mono">{code}</td>
      <td className="py-1">
        <form action={save} className="flex items-center gap-2">
          <input name="plate" defaultValue={plate} required className={`${input} flex-1`} />
          <button disabled={saving} className="rounded border px-3 py-1">บันทึก</button>
        </form>
        <Result state={saved} />
        <Result state={removed} />
      </td>
      <td className="py-1 text-center text-gray-500">{trips}</td>
      <td className="py-1 text-right">
        <form
          action={remove}
          onSubmit={(e) => {
            if (!confirm(`ลบรถ ${plate}? QR ของคันนี้จะใช้ไม่ได้อีก`)) e.preventDefault();
          }}
        >
          <button disabled={removing} className="rounded border border-red-300 px-3 py-1 text-red-600">ลบ</button>
        </form>
      </td>
    </tr>
  );
}
