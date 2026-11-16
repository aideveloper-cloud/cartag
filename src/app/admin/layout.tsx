import { currentRole } from "@/lib/admin";

// ป้ายกลมมุมขวาบนทุกหน้าแอดมิน บอกว่าล็อกอินเป็น role ไหน (หน้า login ไม่มี role → ไม่แสดง)
const BADGE = {
  admin: { text: "แอดมิน", className: "bg-gray-900 text-white" },
  viewer: { text: "Viewer", className: "bg-sky-100 text-sky-900 ring-1 ring-sky-300" },
} as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const role = await currentRole();
  const badge = role ? BADGE[role] : null;
  return (
    <>
      {badge && (
        <div className="no-print flex justify-end px-4 pt-3">
          <span role="status" className={`rounded-full px-3 py-1 text-xs font-medium ${badge.className}`}>
            {badge.text}
          </span>
        </div>
      )}
      {children}
    </>
  );
}
