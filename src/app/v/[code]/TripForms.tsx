"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { endTrip, lookupEmployee, startTrip, type FormState } from "./actions";

const input =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";
const label = "mb-1 block text-sm font-medium text-gray-700";
const EMPLOYEE_KEY = "employeeCode";

// ย่อรูปจากกล้องมือถือ (มักใหญ่ 3–8MB) ให้เหลือด้านยาวไม่เกิน 1600px เป็น JPEG ก่อนส่ง
async function compressPhotos(form: FormData) {
  for (const key of ["photo", "selfie"]) {
    const file = form.get(key);
    if (!(file instanceof File) || file.size === 0) continue;
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
function useTripForm(submit: (prev: FormState, form: FormData) => Promise<FormState>) {
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

function Feedback({ state, confirming }: { state: FormState; confirming: boolean }) {
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

function SubmitButton({ pending, confirming, text, color }: { pending: boolean; confirming: boolean; text: string; color: string }) {
  return (
    <button
      disabled={pending}
      className={`w-full rounded-lg py-4 text-lg font-bold text-white disabled:opacity-50 ${confirming ? "bg-orange-600" : color}`}
    >
      {pending ? "กำลังบันทึก..." : confirming ? "ยืนยันว่าถูกต้อง และบันทึก" : text}
    </button>
  );
}

function PhotoInput({ name, title, capture, required }: { name: string; title: string; capture: "user" | "environment"; required?: boolean }) {
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <div>
      <label className={label}>{title}</label>
      <label className="relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-gray-600">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="max-h-48 rounded" />
        ) : (
          <span className="text-3xl">{capture === "user" ? "🤳" : "📷"}</span>
        )}
        <span className="text-sm">{preview ? "แตะเพื่อถ่ายใหม่" : "แตะเพื่อถ่ายรูป"}</span>
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

function EmployeeInput() {
  const [code, setCode] = useState("");
  const [found, setFound] = useState<{ name: string; department: string } | null | undefined>(undefined);

  // จำรหัสพนักงานไว้ในเครื่อง คนเดิมใช้มือถือเดิมไม่ต้องพิมพ์ซ้ำ
  useEffect(() => {
    try {
      const saved = localStorage.getItem(EMPLOYEE_KEY);
      if (saved) setCode(saved);
    } catch {}
  }, []);

  useEffect(() => {
    const c = code.trim();
    if (!c) return setFound(undefined);
    const t = setTimeout(async () => {
      const emp = await lookupEmployee(c);
      setFound(emp);
      if (emp) {
        try {
          localStorage.setItem(EMPLOYEE_KEY, c);
        } catch {}
      }
    }, 300);
    return () => clearTimeout(t);
  }, [code]);

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

export function StartTripForm({ code }: { code: string }) {
  const f = useTripForm((prev, form) => startTrip(code, prev, form));

  return (
    <form onSubmit={f.onSubmit} onChange={f.onChange} className="space-y-4">
      <EmployeeInput />
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
  const f = useTripForm((prev, form) => endTrip(code, prev, form));

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
