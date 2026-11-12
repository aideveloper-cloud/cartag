"use client";

import Link from "next/link";
import { useState } from "react";

type Card = { code: string; plate: string; inUse: boolean; line: string };
type Group = { id: string; name: string; vehicles: Card[] };

// การ์ดรถแยกตามกลุ่ม — โหมดเลือก (กดปุ่ม "รายงาน"): แตะการ์ด/ชื่อกลุ่มเพื่อติ๊ก แล้วกด "ดูรายงาน"
export default function VehicleBoard({ groups, selecting, cancelHref }: { groups: Group[]; selecting: boolean; cancelHref: string }) {
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const set = (codes: string[], on: boolean) =>
    setPicked((prev) => {
      const next = new Set(prev);
      for (const c of codes) {
        if (on) next.add(c);
        else next.delete(c);
      }
      return next;
    });

  const reportHref = `/admin/reports?${new URLSearchParams([...picked].map((c) => ["v", c]))}`;

  return (
    <>
      {selecting && (
        <p className="mb-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
          ติ๊กรถที่ต้องการดูรายงาน (ติ๊กชื่อกลุ่ม = เลือกทั้งกลุ่ม) แล้วกด &quot;ดูรายงาน&quot; ด้านล่าง
        </p>
      )}
      {groups.map((g) => {
        const codes = g.vehicles.map((v) => v.code);
        const n = codes.filter((c) => picked.has(c)).length;
        return (
          <section key={g.id} className="mb-6">
            <h2 className="mb-2 font-bold text-gray-700">
              {selecting ? (
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={n === codes.length}
                    ref={(el) => {
                      if (el) el.indeterminate = n > 0 && n < codes.length;
                    }}
                    onChange={(e) => set(codes, e.target.checked)}
                  />
                  กลุ่ม{g.name} ({codes.length})
                </label>
              ) : (
                <>
                  กลุ่ม{g.name} ({codes.length})
                </>
              )}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {g.vehicles.map((v) => {
                const body = (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-3 text-xl font-bold">
                        {selecting && (
                          <input
                            type="checkbox"
                            className="h-5 w-5"
                            checked={picked.has(v.code)}
                            onChange={(e) => set([v.code], e.target.checked)}
                            aria-label={`เลือก ${v.plate}`}
                          />
                        )}
                        {v.plate}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-sm ${v.inUse ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}
                      >
                        {v.inUse ? "กำลังใช้งาน" : "ว่าง"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">{v.line}</p>
                  </>
                );
                const card = "rounded-xl bg-white p-4 shadow-sm transition hover:shadow-md";
                return selecting ? (
                  <label
                    key={v.code}
                    className={`${card} cursor-pointer ring-2 ${picked.has(v.code) ? "ring-blue-500" : "ring-transparent"}`}
                  >
                    {body}
                  </label>
                ) : (
                  <Link key={v.code} href={`/admin/vehicles/${v.code}`} className={card}>
                    {body}
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      {selecting && (
        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t bg-white/95 p-4">
          <span className="mr-auto text-sm text-gray-600">เลือกแล้ว {picked.size} คัน</span>
          <Link href={cancelHref} className="rounded-lg border px-4 py-2">
            ยกเลิก
          </Link>
          {picked.size > 0 ? (
            <Link href={reportHref} className="rounded-lg bg-blue-600 px-4 py-2 text-white">
              ดูรายงาน
            </Link>
          ) : (
            <span className="rounded-lg bg-blue-300 px-4 py-2 text-white">ดูรายงาน</span>
          )}
        </div>
      )}
    </>
  );
}
