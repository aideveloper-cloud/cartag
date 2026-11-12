import { notFound } from "next/navigation";
import { formatDate, formatTime } from "@/lib/format";
import { getOpenTrip, getVehicleByCode } from "@/lib/trips";
import { categoryLabel } from "@/lib/vehicles";
import { EndTripForm, StartTripForm } from "./TripForms";

export const dynamic = "force-dynamic";

export default async function ScanPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const vehicle = await getVehicleByCode(code);
  if (!vehicle) notFound();

  const openTrip = await getOpenTrip(vehicle.id);

  return (
    <main className="mx-auto min-h-screen max-w-md p-4">
      <header className="mb-4 rounded-xl bg-yellow-300 p-4 text-center">
        <p className="text-sm text-gray-700">ทะเบียนรถ</p>
        <h1 className="text-3xl font-bold">{vehicle.plate}</h1>
        <p className="mt-1 text-sm text-gray-700">
          {categoryLabel(vehicle.group.category)} · กลุ่ม{vehicle.group.name}
        </p>
      </header>

      <section className="rounded-xl bg-white p-5 shadow-sm">
        {openTrip ? (
          <>
            <h2 className="mb-3 text-xl font-bold text-green-700">คืนรถ</h2>
            <dl className="mb-5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg bg-gray-50 p-3 text-sm">
              <dt className="text-gray-500">ผู้ใช้รถ</dt>
              <dd>{openTrip.driver}</dd>
              <dt className="text-gray-500">แผนก</dt>
              <dd>{openTrip.department || "-"}</dd>
              <dt className="text-gray-500">ออกเมื่อ</dt>
              <dd>
                {formatDate(openTrip.departedAt)} {formatTime(openTrip.departedAt)} น.
              </dd>
              <dt className="text-gray-500">เส้นทาง</dt>
              <dd>
                {openTrip.origin} → {openTrip.destination}
              </dd>
              <dt className="text-gray-500">ไมล์ก่อนเดินทาง</dt>
              <dd>{openTrip.mileageStart.toLocaleString()}</dd>
            </dl>
            <EndTripForm code={code} mileageStart={openTrip.mileageStart} />
          </>
        ) : (
          <>
            <h2 className="mb-3 text-xl font-bold text-blue-700">ออกเดินทาง</h2>
            <StartTripForm code={code} />
          </>
        )}
      </section>
    </main>
  );
}
