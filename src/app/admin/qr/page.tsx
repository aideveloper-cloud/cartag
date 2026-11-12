import Link from "next/link";
import QRCode from "qrcode";
import CategoryTabs from "@/components/CategoryTabs";
import { prisma } from "@/lib/db";
import { baseUrl } from "@/lib/format";
import { categoryFromParam, categoryKey, vehicleOrder } from "@/lib/vehicles";
import PrintButton from "./PrintButton";
import QrDownload from "./QrDownload";

export const dynamic = "force-dynamic";

// QR ใช้รถ และ QR เติมน้ำมัน — รถทุกคันได้ 2 อัน — สีหัวการ์ดต่างกันกันติดสลับ
const KINDS = {
  use: { path: "v", title: "สแกนเพื่อบันทึกการใช้รถ", icon: "🚗", head: "bg-yellow-300", file: "QR" },
  fuel: { path: "f", title: "สแกนเพื่อบันทึกเติมน้ำมัน", icon: "⛽", head: "bg-emerald-300", file: "QR-เติมน้ำมัน" },
} as const;

async function card(v: { id: string; code: string; plate: string }, kind: keyof typeof KINDS) {
  const k = KINDS[kind];
  const url = `${baseUrl()}/${k.path}/${v.code}`;
  return { key: `${v.id}-${kind}`, kind, k, url, plate: v.plate, code: v.code, svg: await QRCode.toString(url, { type: "svg", margin: 1 }) };
}

export default async function QrSheetPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const category = categoryFromParam((await searchParams).type);
  const vehicles = await prisma.vehicle.findMany({ where: { group: { category } }, orderBy: vehicleOrder });
  // การ์ดใช้รถกับเติมน้ำมันวางคู่กันในแถวเดียว
  const cards = await Promise.all(
    vehicles.flatMap((v) => [card(v, "use"), card(v, "fuel")]),
  );

  return (
    <main className="mx-auto max-w-4xl p-4">
      <div className="no-print mb-4 flex items-center gap-4">
        <Link href={`/admin?type=${categoryKey(category)}`} className="text-blue-600">← กลับ</Link>
        <PrintButton />
        <span className="text-sm text-gray-500">QR ชี้ไปที่ {baseUrl()} — ตั้งค่าได้ที่ BASE_URL</span>
      </div>
      <CategoryTabs path="/admin/qr" current={category} />
      {cards.length === 0 && <p className="text-center text-gray-500">ยังไม่มีรถประเภทนี้</p>}
      <div className="grid grid-cols-2 gap-4">
        {cards.map((c) => (
          <div key={c.key} className="break-inside-avoid overflow-hidden rounded-xl border-2 border-gray-800 bg-white text-center">
            <p className={`${c.k.head} py-1 text-sm font-medium`}>
              {c.k.icon} {c.k.title}
            </p>
            <div className="p-4 pt-2">
              <div className="mx-auto my-2 w-56" dangerouslySetInnerHTML={{ __html: c.svg }} />
              <p className="inline-block bg-yellow-300 px-4 py-1 text-2xl font-bold">{c.plate}</p>
              <p className="mt-2 break-all text-xs text-gray-400">{c.url}</p>
              <QrDownload
                src={`/api/qr/${c.code}${c.kind === "fuel" ? "?kind=fuel" : ""}`}
                title={`${c.k.icon} ${c.k.title}`}
                plate={c.plate}
                filename={`${c.k.file}-${c.plate}.png`}
              />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
