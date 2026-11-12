import Link from "next/link";
import { notFound } from "next/navigation";
import { getVehicleByCode } from "@/lib/trips";

export default async function FuelDonePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const vehicle = await getVehicleByCode(code);
  if (!vehicle) notFound();

  return (
    <main className="mx-auto min-h-screen max-w-md p-4">
      <header className="mb-4 rounded-xl bg-emerald-200 p-4 text-center">
        <p className="text-sm text-gray-700">⛽ บันทึกเติมน้ำมัน · ทะเบียนรถ</p>
        <h1 className="text-3xl font-bold">{vehicle.plate}</h1>
      </header>
      <div className="rounded-xl bg-green-50 p-6 text-center">
        <div className="mb-2 text-4xl">✓</div>
        <p className="text-lg font-medium text-green-800">บันทึกการเติมน้ำมันแล้ว</p>
        <Link href={`/f/${code}`} replace className="mt-4 inline-block text-sm text-green-700 underline">
          กลับหน้าหลัก
        </Link>
      </div>
    </main>
  );
}
