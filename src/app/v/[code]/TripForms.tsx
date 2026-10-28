"use client";

import { useActionState, useState } from "react";
import { endTrip, startTrip, type FormState } from "./actions";

const input =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";
const label = "mb-1 block text-sm font-medium text-gray-700";

function Message({ state }: { state: FormState }) {
  if (state.error) return <p className="rounded-lg bg-red-50 p-3 text-red-700">{state.error}</p>;
  return null;
}

// ย่อรูปจากกล้องมือถือ (มักใหญ่ 3–8MB) ให้เหลือด้านยาวไม่เกิน 1600px เป็น JPEG ก่อนส่ง
async function compressPhoto(form: FormData) {
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.8));
    if (blob) form.set("photo", new File([blob], "photo.jpg", { type: "image/jpeg" }));
  } catch {
    // ย่อไม่ได้ (เช่นเบราว์เซอร์เก่า) ส่งไฟล์เดิมไป
  }
}

function PhotoInput({ title }: { title: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <div>
      <label className={label}>{title}</label>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-gray-600">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="max-h-48 rounded" />
        ) : (
          <span className="text-3xl">📷</span>
        )}
        <span className="text-sm">{preview ? "แตะเพื่อถ่ายใหม่" : "แตะเพื่อถ่ายรูป / เลือกรูป"}</span>
        <input
          type="file"
          name="photo"
          accept="image/*"
          capture="environment"
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

export function StartTripForm({
  code,
  lastMileage,
  departments,
}: {
  code: string;
  lastMileage: number | null;
  departments: string[];
}) {
  const [state, action, pending] = useActionState(async (prev: FormState, form: FormData) => {
    await compressPhoto(form);
    return startTrip(code, prev, form);
  }, {});

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className={label}>ผู้ใช้รถ</label>
        <input name="driver" required className={input} placeholder="ชื่อ-นามสกุล" autoComplete="name" />
      </div>
      <div>
        <label className={label}>แผนก</label>
        <input name="department" required className={input} list="departments" placeholder="เช่น จัดซื้อ" />
        <datalist id="departments">
          {departments.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
      </div>
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
          defaultValue={lastMileage ?? ""}
        />
        {lastMileage !== null && (
          <p className="mt-1 text-xs text-gray-500">เติมจากเลขไมล์ล่าสุด — แก้ไขได้ถ้าไม่ตรงหน้าปัด</p>
        )}
      </div>
      <PhotoInput title="รูปหน้าปัดเลขไมล์ (ไม่บังคับ)" />
      <Message state={state} />
      <button
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 py-4 text-lg font-bold text-white disabled:opacity-50"
      >
        {pending ? "กำลังบันทึก..." : "บันทึกออกเดินทาง"}
      </button>
    </form>
  );
}

export function EndTripForm({ code, mileageStart }: { code: string; mileageStart: number }) {
  const [state, action, pending] = useActionState(async (prev: FormState, form: FormData) => {
    await compressPhoto(form);
    return endTrip(code, prev, form);
  }, {});

  return (
    <form action={action} className="space-y-4">
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
      <PhotoInput title="รูปหน้าปัดเลขไมล์ (ไม่บังคับ)" />
      <Message state={state} />
      <button
        disabled={pending}
        className="w-full rounded-lg bg-green-600 py-4 text-lg font-bold text-white disabled:opacity-50"
      >
        {pending ? "กำลังบันทึก..." : "บันทึกคืนรถ"}
      </button>
    </form>
  );
}
