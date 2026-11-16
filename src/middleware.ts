import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, roleFromToken } from "@/lib/token";

// /admin และ /api: เข้าได้ทั้ง admin และ viewer — สิทธิ์เขียนตรวจใน server action ด้วย assertAdmin()
export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/admin/login") return NextResponse.next();
  if (await roleFromToken(req.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.next();
  return NextResponse.redirect(new URL("/admin/login", req.url));
}

export const config = { matcher: ["/admin/:path*", "/api/:path*"] };
