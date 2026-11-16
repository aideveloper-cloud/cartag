"use client";

import { useActionState } from "react";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form action={action} className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow-sm">
        {/* หน้าเดียวกันทั้งแอดมินและผู้ดูอย่างเดียว — role ขึ้นกับรหัสที่ใส่ */}
        <h1 className="text-xl font-bold">เข้าสู่ระบบ — ระบบบันทึกการใช้รถ</h1>
        <input
          type="password"
          name="password"
          required
          autoFocus
          placeholder="รหัสผ่าน"
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button disabled={pending} className="w-full rounded-lg bg-blue-600 py-2 font-bold text-white">
          เข้าสู่ระบบ
        </button>
      </form>
    </main>
  );
}
