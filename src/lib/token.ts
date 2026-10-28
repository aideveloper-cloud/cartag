export const ADMIN_COOKIE = "admin_session";

// โทเคนที่เก็บในคุกกี้ = SHA-256 ของรหัสผ่าน (ไม่เก็บรหัสผ่านตรง ๆ) — ใช้ได้ทั้งใน middleware และ server
export async function adminToken() {
  const data = new TextEncoder().encode(`qrtracker:${process.env.ADMIN_PASSWORD ?? ""}`);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return Array.from(hash, (b) => b.toString(16).padStart(2, "0")).join("");
}
