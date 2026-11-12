"use client";

import { useState } from "react";

type Group = { id: string; name: string; category: string; vehicles: { code: string; plate: string }[] };

// ติ๊กเลือกรถหลายคัน — ติ๊กชื่อกลุ่ม = เลือก/ยกเลิกทั้งกลุ่ม; ส่งเป็น v=code หลายค่า
export default function VehiclePicker({ groups, selected }: { groups: Group[]; selected: string[] }) {
  const [picked, setPicked] = useState(() => new Set(selected));
  const all = groups.flatMap((g) => g.vehicles.map((v) => v.code));

  const set = (codes: string[], on: boolean) =>
    setPicked((prev) => {
      const next = new Set(prev);
      for (const c of codes) {
        if (on) next.add(c);
        else next.delete(c);
      }
      return next;
    });

  const categories = [...new Set(groups.map((g) => g.category))];

  return (
    <div className="space-y-3">
      <div className="flex gap-3 text-sm">
        <button type="button" onClick={() => set(all, true)} className="text-blue-600 underline">
          เลือกทั้งหมด
        </button>
        <button type="button" onClick={() => set(all, false)} className="text-blue-600 underline">
          ล้าง
        </button>
        <span className="text-gray-500">เลือกแล้ว {picked.size} คัน</span>
      </div>
      {categories.map((cat) => (
        <div key={cat}>
          <p className="mb-1 text-sm font-bold text-gray-500">{cat}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {groups
              .filter((g) => g.category === cat)
              .map((g) => {
                const codes = g.vehicles.map((v) => v.code);
                const n = codes.filter((c) => picked.has(c)).length;
                return (
                  <fieldset key={g.id} className="rounded-lg border bg-white p-3">
                    <legend className="px-1">
                      <label className="flex items-center gap-2 font-medium">
                        <input
                          type="checkbox"
                          checked={codes.length > 0 && n === codes.length}
                          ref={(el) => {
                            if (el) el.indeterminate = n > 0 && n < codes.length;
                          }}
                          disabled={codes.length === 0}
                          onChange={(e) => set(codes, e.target.checked)}
                        />
                        กลุ่ม{g.name} ({codes.length})
                      </label>
                    </legend>
                    {codes.length === 0 && <p className="text-sm text-gray-400">ยังไม่มีรถ</p>}
                    <div className="space-y-1">
                      {g.vehicles.map((v) => (
                        <label key={v.code} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            name="v"
                            value={v.code}
                            checked={picked.has(v.code)}
                            onChange={(e) => set([v.code], e.target.checked)}
                          />
                          {v.plate}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
