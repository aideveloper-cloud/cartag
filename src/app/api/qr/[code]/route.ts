import QRCode from "qrcode";
import { baseUrl } from "@/lib/format";

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const png = await QRCode.toBuffer(`${baseUrl()}/v/${encodeURIComponent(code)}`, { width: 600, margin: 2 });
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
}
