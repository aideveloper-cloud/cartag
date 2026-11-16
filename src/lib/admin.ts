import { cookies } from "next/headers";
import { ADMIN_COOKIE, type Role, roleFromToken } from "./token";

// role ของคนที่เปิดหน้า/เรียก action อยู่ (null = ไม่ได้ล็อกอิน)
export async function currentRole(): Promise<Role | null> {
  return roleFromToken((await cookies()).get(ADMIN_COOKIE)?.value);
}

// ใช้ใน server action ที่เขียนข้อมูล (middleware กันหน้าไว้แล้ว แต่ action ควรตรวจซ้ำเอง) — เฉพาะ admin
export async function assertAdmin() {
  if ((await currentRole()) !== "admin") throw new Error("Unauthorized");
}

// หน้าแอดมิน: แสดงปุ่ม/ฟอร์มเพิ่ม-แก้-ลบ-นำเข้าหรือไม่ (viewer = ไม่แสดง)
export async function canEdit() {
  return (await currentRole()) === "admin";
}

// API ที่อ่านข้อมูล (Excel, QR, รูป): admin หรือ viewer — ไม่ได้ล็อกอินได้ 401 (กันซ้ำนอกเหนือจาก middleware)
export async function readerOnly(): Promise<Response | null> {
  return (await currentRole()) ? null : new Response("Unauthorized", { status: 401 });
}
