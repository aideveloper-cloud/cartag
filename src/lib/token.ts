// คุกกี้เดียว (ชื่อเดิม) — ค่าเป็น hash ของรหัสผ่านตาม role จึงบอกได้ว่าเป็น admin หรือ viewer
// โดย client แก้ role เองไม่ได้ (ต้องรู้รหัสของ role นั้นถึงจะได้ค่าที่ถูก) — ใช้ได้ทั้งใน middleware (edge) และ server
export const ADMIN_COOKIE = "admin_session";

export type Role = "admin" | "viewer";

async function sha256(text: string) {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  return Array.from(hash, (b) => b.toString(16).padStart(2, "0")).join("");
}

// prefix ต่างกันต่อ role — ค่าคุกกี้ของ admin กับ viewer ไม่มีวันชนกันแม้ใช้รหัสเดียวกัน
// prefix ของ admin คงไว้เหมือนเดิม คุกกี้ที่ล็อกอินอยู่แล้วจึงยังใช้ได้หลังอัปเดต
export async function adminToken() {
  const pw = process.env.ADMIN_PASSWORD;
  return pw ? sha256(`qrtracker:${pw}`) : null;
}

// ไม่ได้ตั้ง VIEWER_PASSWORD (หรือตั้งเหมือนรหัสแอดมิน) = ไม่มี viewer
export async function viewerToken() {
  const pw = process.env.VIEWER_PASSWORD;
  return pw && pw !== process.env.ADMIN_PASSWORD ? sha256(`qrtracker-viewer:${pw}`) : null;
}

// ค่าคุกกี้ → role (null = ไม่ได้ล็อกอิน/ค่าไม่ถูกต้อง)
export async function roleFromToken(value: string | undefined): Promise<Role | null> {
  if (!value) return null;
  const admin = await adminToken();
  if (admin && value === admin) return "admin";
  const viewer = await viewerToken();
  if (viewer && value === viewer) return "viewer";
  return null;
}
