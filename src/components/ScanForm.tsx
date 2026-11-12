"use client";

// ชิ้นส่วนฟอร์มฝั่งพนักงาน (มือถือ) ใช้ร่วมกันระหว่างฟอร์มใช้รถ /v และฟอร์มเติมน้ำมัน /f
import { useActionState, useEffect, useState, useTransition } from "react";
import type { FormState } from "@/lib/form";

export const input =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";
export const label = "mb-1 block text-sm font-medium text-gray-700";
const EMPLOYEE_KEY = "employeeCode";

// ย่อรูปจากกล้องมือถือ (มักใหญ่ 3–8MB) ให้เหลือด้านยาวไม่เกิน 1600px เป็น JPEG ก่อนส่ง — ทุกช่องไฟล์รูปในฟอร์ม
async function compressPhotos(form: FormData) {
  for (const [key, file] of Array.from(form.entries())) {
    if (!(file instanceof File) || file.size === 0 || !file.type.startsWith("image/")) continue;
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.8));
      if (blob) form.set(key, new File([blob], `${key}.jpg`, { type: "image/jpeg" }));
    } catch {
      // ย่อไม่ได้ (เช่นเบราว์เซอร์เก่า) ส่งไฟล์เดิมไป
    }
  }
}

// ฟอร์มที่ไม่ล้างค่าเมื่อเกิด error/warning (form action ของ React 19 จะ reset ฟอร์มทุกครั้งที่ส่ง)
// และส่ง confirm=1 อัตโนมัติเมื่อผู้ใช้กดยืนยันคำเตือนโดยไม่ได้แก้ข้อมูล
export function useScanForm(submit: (prev: FormState, form: FormData) => Promise<FormState>) {
  const [state, dispatch, pending] = useActionState(async (prev: FormState, form: FormData) => {
    await compressPhotos(form);
    return submit(prev, form);
  }, {});
  const [, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);
  const confirming = Boolean(state.warning) && !dirty;

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (confirming) form.set("confirm", "1");
    setDirty(false);
    startTransition(() => dispatch(form));
  };
  return { state, pending, confirming, onSubmit, onChange: () => setDirty(true) };
}

export function Feedback({ state, confirming }: { state: FormState; confirming: boolean }) {
  if (state.error) return <p className="rounded-lg bg-red-50 p-3 text-red-700">{state.error}</p>;
  if (state.warning)
    return (
      <div className="whitespace-pre-line rounded-lg bg-orange-50 p-3 text-orange-800">
        ⚠️ {state.warning}
        <p className="mt-1 text-sm">
          {confirming ? "ตรวจหน้าปัดอีกครั้ง ถ้าถูกต้องกดยืนยันด้านล่าง" : "แก้ไขแล้ว กดบันทึกเพื่อตรวจอีกครั้ง"}
        </p>
      </div>
    );
  return null;
}

export function SubmitButton({ pending, confirming, text, color }: { pending: boolean; confirming: boolean; text: string; color: string }) {
  return (
    <button
      disabled={pending}
      className={`w-full rounded-lg py-4 text-lg font-bold text-white disabled:opacity-50 ${confirming ? "bg-orange-600" : color}`}
    >
      {pending ? "กำลังบันทึก..." : confirming ? "ยืนยันว่าถูกต้อง และบันทึก" : text}
    </button>
  );
}

// capture = เปิดกล้องโดยตรง (user = กล้องหน้า, environment = กล้องหลัง) — ไม่ใส่ = ถ่ายหรือเลือกจากคลังรูปก็ได้
export function PhotoInput({
  name,
  title,
  capture,
  required,
  icon = capture === "user" ? "🤳" : "📷",
}: {
  name: string;
  title: string;
  capture?: "user" | "environment";
  required?: boolean;
  icon?: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  return (
    // flex-col + flex-1: วางในกริด (เช่นฟอร์มเติมน้ำมัน 2×2) แล้วกล่องในแถวเดียวกันสูงเท่ากัน
    <div className="flex flex-col">
      <label className={label}>{title}</label>
      <label className="relative flex min-h-32 flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-3 text-gray-600">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="max-h-40 max-w-full rounded object-contain" />
        ) : (
          <span className="text-3xl">{icon}</span>
        )}
        <span className="text-center text-sm">
          {preview ? "แตะเพื่อเปลี่ยนรูป" : capture ? "แตะเพื่อถ่ายรูป" : "ถ่าย หรือเลือกรูป"}
        </span>
        <input
          type="file"
          name={name}
          accept="image/*"
          capture={capture}
          required={required}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setPreview(f ? URL.createObjectURL(f) : null);
          }}
        />
      </label>
    </div>
  );
}

// รหัสพนักงาน + แสดงชื่อ/แผนก — จำรหัสไว้ในเครื่อง คนเดิมใช้มือถือเดิมไม่ต้องพิมพ์ซ้ำ
// initialCode (เช่นผู้ใช้รถที่ยังไม่คืน) มาก่อนรหัสที่จำไว้
export function EmployeeInput({
  lookup,
  initialCode,
}: {
  lookup: (code: string) => Promise<{ name: string; department: string } | null>;
  initialCode?: string;
}) {
  const [code, setCode] = useState(initialCode ?? "");
  const [found, setFound] = useState<{ name: string; department: string } | null | undefined>(undefined);

  useEffect(() => {
    if (initialCode) return;
    try {
      const saved = localStorage.getItem(EMPLOYEE_KEY);
      if (saved) setCode(saved);
    } catch {}
  }, [initialCode]);

  useEffect(() => {
    const c = code.trim();
    if (!c) return setFound(undefined);
    const t = setTimeout(async () => {
      const emp = await lookup(c);
      setFound(emp);
      if (emp) {
        try {
          localStorage.setItem(EMPLOYEE_KEY, c);
        } catch {}
      }
    }, 300);
    return () => clearTimeout(t);
  }, [code, lookup]);

  return (
    <div>
      <label className={label}>รหัสพนักงาน</label>
      <input
        name="employeeCode"
        required
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className={`${input} uppercase`}
        autoCapitalize="characters"
        autoComplete="off"
      />
      {found && (
        <p className="mt-1 rounded bg-green-50 px-2 py-1 text-green-800">
          ✓ {found.name} · {found.department}
        </p>
      )}
      {found === null && <p className="mt-1 text-sm text-red-600">ไม่พบรหัสพนักงานนี้</p>}
    </div>
  );
}
