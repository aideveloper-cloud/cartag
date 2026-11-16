import { currentRole } from "@/lib/admin";

// ป้ายบอกโหมดดูอย่างเดียวทุกหน้าแอดมิน (หน้า login ไม่มี role → ไม่แสดง)
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = (await currentRole()) === "viewer";
  return (
    <>
      {viewer && (
        <p role="status" className="no-print bg-sky-100 px-4 py-2 text-center text-sm font-medium text-sky-900">
          👁️ โหมดดูอย่างเดียว — ดูข้อมูลและดาวน์โหลดรายงานได้ แต่เพิ่ม แก้ไข หรือลบไม่ได้
        </p>
      )}
      {children}
    </>
  );
}
