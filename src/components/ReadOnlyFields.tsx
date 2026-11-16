// รายละเอียดแบบอ่านอย่างเดียว (viewer เปิดหน้าแก้ไขรายการ — เห็นข้อมูลแต่ไม่มีฟอร์ม/ปุ่มลบ)
export default function ReadOnlyFields({ fields }: { fields: [label: string, value: React.ReactNode][] }) {
  return (
    <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
      {fields.map(([label, value]) => (
        <div key={label}>
          <dt className="text-sm text-gray-600">{label}</dt>
          <dd className="font-medium">{value === "" || value === null ? "-" : value}</dd>
        </div>
      ))}
    </dl>
  );
}
