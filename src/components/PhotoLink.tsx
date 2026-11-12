"use client";

import { useState } from "react";

// รูปย่อที่กดแล้วเปิดรูปเต็ม (เฉพาะแอดมิน — /api/photos อยู่หลัง middleware)
// ไม่มีรูป หรือโหลดไม่ได้ (เช่นรูปหน้าผู้ยืมถูกลบตามกำหนด) → ไม่แสดงอะไร
export default function PhotoLink({ name, label }: { name: string | null | undefined; label: string }) {
  const [broken, setBroken] = useState(false);
  if (!name || broken) return null;
  return (
    <a href={`/api/photos/${name}`} target="_blank" className="mx-0.5 inline-block text-center text-xs text-blue-600">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/photos/${name}`} alt={label} onError={() => setBroken(true)} className="h-10 w-10 rounded object-cover" />
      {label}
    </a>
  );
}
