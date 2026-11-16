"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, adminToken, viewerToken } from "./token";

// รหัสแอดมิน → คุกกี้ admin, รหัส viewer (ถ้าตั้งไว้) → คุกกี้ viewer (ดูได้อย่างเดียว)
export async function login(_prev: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const password = form.get("password");
  const token =
    process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD
      ? await adminToken()
      : process.env.VIEWER_PASSWORD && password === process.env.VIEWER_PASSWORD
        ? await viewerToken()
        : null;
  if (!token) return { error: "รหัสผ่านไม่ถูกต้อง" };

  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // ตั้ง secure เฉพาะเมื่อใช้ https ไม่งั้นเบราว์เซอร์จะไม่เก็บคุกกี้ และล็อกอินไม่ได้บน http
    secure: (process.env.BASE_URL ?? "").startsWith("https://"),
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}
