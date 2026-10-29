import Link from "next/link";
import { prisma } from "@/lib/db";
import { getDepartments } from "@/lib/trips";
import { updateEmployee } from "./actions";
import { AddEmployeeForm, DeleteEmployeeButton, ImportForm } from "./Forms";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const [employees, departments] = await Promise.all([
    prisma.employee.findMany({ orderBy: [{ active: "desc" }, { code: "asc" }] }),
    getDepartments(),
  ]);

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4">
      <Link href="/admin" className="text-blue-600">
        ← กลับ
      </Link>
      <h1 className="text-2xl font-bold">พนักงาน ({employees.filter((e) => e.active).length} คน)</h1>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-bold">เพิ่มพนักงาน</h2>
        <AddEmployeeForm departments={departments} />
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="font-bold">นำเข้าหลายคน</h2>
        <p className="mb-2 text-sm text-gray-500">
          คัดลอก 3 คอลัมน์ (รหัส, ชื่อ, แผนก) จาก Excel มาวางได้เลย — รหัสที่มีอยู่แล้วจะถูกอัปเดต
        </p>
        <ImportForm />
      </section>

      <section className="overflow-x-auto rounded-xl bg-white p-4 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">รหัส</th>
              <th colSpan={4}>ชื่อ · แผนก · ใช้งาน</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-400">
                  ยังไม่มีพนักงาน — ต้องเพิ่มก่อนจึงจะยืมรถได้
                </td>
              </tr>
            )}
            {employees.map((e) => (
              <tr key={e.id} className={`border-b ${e.active ? "" : "text-gray-400"}`}>
                <td className="py-1 font-mono">{e.code}</td>
                <td colSpan={4}>
                  <div className="flex items-center gap-2">
                    <form action={updateEmployee.bind(null, e.id)} className="flex flex-1 items-center gap-2">
                      <input name="name" defaultValue={e.name} className="flex-1 rounded border px-2 py-1" />
                      <input name="department" defaultValue={e.department} list="dept-list" className="w-40 rounded border px-2 py-1" />
                      <input type="checkbox" name="active" defaultChecked={e.active} className="h-4 w-4" />
                      <button className="rounded border px-3 py-1">บันทึก</button>
                    </form>
                    <DeleteEmployeeButton id={e.id} name={e.name} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
