import Link from "next/link";
import { notFound } from "next/navigation";
import { getVehicleByCode } from "@/lib/trips";

export default async function DonePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ t?: string; km?: string }>;
}) {
  const { code } = await params;
  const { t, km } = await searchParams;
  const vehicle = await getVehicleByCode(code);
  if (!vehicle) notFound();

  const text =
    t === "end"
      ? `คืนรถเรียบร้อย ระยะทางรวม ${Number(km ?? 0).toLocaleString()} กม.`
      : "บันทึกการออกเดินทางแล้ว เดินทางปลอดภัย";

  return (
    <main className="mx-auto min-h-screen max-w-md p-4">
      <header className="mb-4 rounded-xl bg-yellow-300 p-4 text-center">
        <p className="text-sm text-gray-700">ทะเบียนรถ</p>
        <h1 className="text-3xl font-bold">{vehicle.plate}</h1>
      </header>
      <div className="rounded-xl bg-green-50 p-6 text-center">
        <div className="mb-2 text-4xl">✓</div>
        <p className="text-lg font-medium text-green-800">{text}</p>
        {t !== "end" && <p className="mt-3 text-sm text-gray-600">เมื่อกลับมา สแกน QR อีกครั้งเพื่อบันทึกคืนรถ</p>}
        <Link href={`/v/${code}`} replace className="mt-4 inline-block text-sm text-green-700 underline">
          กลับหน้าหลัก
        </Link>
      </div>
    </main>
  );
}
