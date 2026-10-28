"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, adminToken } from "./token";

export async function login(_prev: { error?: string }, form: FormData): Promise<{ error?: string }> {
  if (!process.env.ADMIN_PASSWORD || form.get("password") !== process.env.ADMIN_PASSWORD) {
    return { error: "รหัสผ่านไม่ถูกต้อง" };
  }
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, await adminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}
