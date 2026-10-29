"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";

export type EmpState = { error?: string; ok?: string };

const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const normCode = (v: string) => v.toUpperCase();

export async function addEmployee(_prev: EmpState, form: FormData): Promise<EmpState> {
  await assertAdmin();
  const code = normCode(clean(form.get("code")));
  const name = clean(form.get("name"));
  const department = clean(form.get("department"));
  if (!code || !name || !department) return { error: "กรอกให้ครบทุกช่อง" };
  if (await prisma.employee.findUnique({ where: { code } })) return { error: `รหัส ${code} มีอยู่แล้ว` };
  await prisma.employee.create({ data: { code, name, department } });
  revalidatePath("/admin/employees");
  return { ok: `เพิ่ม ${name} แล้ว` };
}

// นำเข้าทีละหลายคน: วางจาก Excel ได้ 1 บรรทัด = รหัส, ชื่อ, แผนก (คั่นด้วย tab หรือ ,)
export async function importEmployees(_prev: EmpState, form: FormData): Promise<EmpState> {
  await assertAdmin();
  const lines = clean(form.get("rows")).split(/\r?\n/).filter((l) => l.trim());
  const bad: number[] = [];
  let count = 0;
  for (const [i, line] of lines.entries()) {
    const [code, name, department] = line.split(/\t|,/).map((s) => s.trim());
    if (!code || !name || !department) {
      bad.push(i + 1);
      continue;
    }
    await prisma.employee.upsert({
      where: { code: normCode(code) },
      update: { name, department, active: true },
      create: { code: normCode(code), name, department },
    });
    count++;
  }
  revalidatePath("/admin/employees");
  if (bad.length) return { error: `นำเข้า ${count} คน — บรรทัด ${bad.join(", ")} ข้อมูลไม่ครบ ข้ามไป` };
  return { ok: `นำเข้า/อัปเดต ${count} คนแล้ว` };
}

export async function updateEmployee(id: string, form: FormData) {
  await assertAdmin();
  const name = clean(form.get("name"));
  const department = clean(form.get("department"));
  if (!name || !department) return;
  await prisma.employee.update({
    where: { id },
    data: { name, department, active: form.get("active") === "on" },
  });
  revalidatePath("/admin/employees");
}

// ลบถาวร — รายการใช้รถเดิมยังอยู่ เพราะเก็บชื่อ/แผนกไว้ในตัวรายการเอง แค่ตัดการอ้างอิงถึงพนักงาน
export async function deleteEmployee(id: string) {
  await assertAdmin();
  await prisma.$transaction([
    prisma.trip.updateMany({ where: { employeeId: id }, data: { employeeId: null } }),
    prisma.employee.delete({ where: { id } }),
  ]);
  revalidatePath("/admin/employees");
}
