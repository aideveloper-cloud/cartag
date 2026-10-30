import Link from "next/link";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { baseUrl } from "@/lib/format";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function QrSheetPage() {
  const vehicles = await prisma.vehicle.findMany({ orderBy: [{ createdAt: "asc" }, { code: "asc" }] });
  const cards = await Promise.all(
    vehicles.map(async (v) => {
      const url = `${baseUrl()}/v/${v.code}`;
      return { ...v, url, svg: await QRCode.toString(url, { type: "svg", margin: 1 }) };
    }),
  );

  return (
    <main className="mx-auto max-w-4xl p-4">
      <div className="no-print mb-4 flex items-center gap-4">
        <Link href="/admin" className="text-blue-600">← กลับ</Link>
        <PrintButton />
        <span className="text-sm text-gray-500">QR ชี้ไปที่ {baseUrl()} — ตั้งค่าได้ที่ BASE_URL</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {cards.map((v) => (
          <div key={v.id} className="break-inside-avoid rounded-xl border-2 border-gray-800 bg-white p-4 text-center">
            <p className="text-sm">สแกนเพื่อบันทึกการใช้รถ</p>
            <div className="mx-auto my-2 w-56" dangerouslySetInnerHTML={{ __html: v.svg }} />
            <p className="inline-block bg-yellow-300 px-4 py-1 text-2xl font-bold">{v.plate}</p>
            <p className="mt-2 break-all text-xs text-gray-400">{v.url}</p>
            <a href={`/api/qr/${v.code}`} download={`QR-${v.plate}.png`} className="no-print mt-1 block text-sm text-blue-600">
              ดาวน์โหลด PNG
            </a>
          </div>
        ))}
      </div>
    </main>
  );
}
