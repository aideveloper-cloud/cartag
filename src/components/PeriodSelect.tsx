"use client";

type Preset = { label: string; from: string; to: string };

// dropdown ช่วงเวลา — ต้องอยู่ในฟอร์มเดียวกับช่อง from/to: เลือกแล้วใส่วันที่ให้และส่งฟอร์มทันที
// "กำหนดเอง" พาไปที่ช่องตั้งแต่ (ฟอร์มส่งค่าอื่น ๆ เช่นรถที่ติ๊กไว้ไปด้วย)
export default function PeriodSelect({ presets, from, to }: { presets: Preset[]; from: string; to: string }) {
  const current = presets.findIndex((p) => p.from === from && p.to === to);

  return (
    <select
      aria-label="ช่วงเวลา"
      defaultValue={current >= 0 ? String(current) : "custom"}
      onChange={(e) => {
        const form = e.currentTarget.form;
        const input = (name: string) => form?.elements.namedItem(name) as HTMLInputElement | null;
        const p = presets[Number(e.currentTarget.value)];
        if (!p) return input("from")?.focus();
        input("from")!.value = p.from;
        input("to")!.value = p.to;
        form!.requestSubmit();
      }}
      className="rounded border bg-white px-2 py-1"
    >
      {presets.map((p, i) => (
        <option key={p.label} value={i}>
          {p.label}
        </option>
      ))}
      <option value="custom">กำหนดเอง</option>
    </select>
  );
}
