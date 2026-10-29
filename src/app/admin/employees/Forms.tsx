"use client";

import { useActionState } from "react";
import { addEmployee, deleteEmployee, importEmployees, type EmpState } from "./actions";

const input = "rounded border border-gray-300 px-2 py-1";

function Result({ state }: { state: EmpState }) {
  if (state.error) return <p className="text-sm text-red-600">{state.error}</p>;
  if (state.ok) return <p className="text-sm text-green-700">{state.ok}</p>;
  return null;
}

export function AddEmployeeForm({ departments }: { departments: string[] }) {
  const [state, action, pending] = useActionState(addEmployee, {});
  return (
    <form action={action} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <input name="code" placeholder="รหัสพนักงาน" required className={`${input} w-32 uppercase`} />
        <input name="name" placeholder="ชื่อ-นามสกุล" required className={`${input} flex-1`} />
        <input name="department" placeholder="แผนก" required list="dept-list" className={`${input} w-40`} />
        <datalist id="dept-list">
          {departments.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
        <button disabled={pending} className="rounded bg-blue-600 px-4 py-1 text-white">
          เพิ่ม
        </button>
      </div>
      <Result state={state} />
    </form>
  );
}

export function DeleteEmployeeButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteEmployee.bind(null, id)}
      onSubmit={(e) => {
        if (!confirm(`ลบ ${name} ออกจากระบบ? ประวัติการใช้รถเดิมยังอยู่`)) e.preventDefault();
      }}
    >
      <button className="rounded border border-red-300 px-3 py-1 text-red-600">ลบ</button>
    </form>
  );
}

export function ImportForm() {
  const [state, action, pending] = useActionState(importEmployees, {});
  return (
    <form action={action} className="space-y-2">
      <textarea
        name="rows"
        rows={5}
        required
        className={`${input} w-full font-mono text-sm`}
        placeholder={"E001\tสมชาย ใจดี\tจัดซื้อ\nE002\tสมหญิง รักงาน\tบัญชี"}
      />
      <div className="flex items-center gap-3">
        <button disabled={pending} className="rounded bg-gray-900 px-4 py-1 text-white">
          นำเข้า
        </button>
        <Result state={state} />
      </div>
    </form>
  );
}
