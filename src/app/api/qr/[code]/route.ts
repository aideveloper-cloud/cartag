import QRCode from "qrcode";
import { baseUrl } from "@/lib/format";

// รูป QR อย่างเดียว — ?kind=fuel = QR เติมน้ำมัน (/f/...) ไม่งั้น QR ใช้รถ (/v/...)
// ไฟล์ที่ดาวน์โหลดจากหน้าพิมพ์ QR ใส่ทะเบียนเพิ่มฝั่งเบราว์เซอร์ (QrDownload)
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const path = new URL(req.url).searchParams.get("kind") === "fuel" ? "f" : "v";
  const png = await QRCode.toBuffer(`${baseUrl()}/${path}/${encodeURIComponent(code)}`, { width: 600, margin: 2 });
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
}
