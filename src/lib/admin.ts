import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminToken } from "./token";

// ใช้ใน server action ของแอดมิน (middleware กันหน้าไว้แล้ว แต่ action ควรตรวจซ้ำเอง)
export async function assertAdmin() {
  const jar = await cookies();
  if (jar.get(ADMIN_COOKIE)?.value !== (await adminToken())) throw new Error("Unauthorized");
}
