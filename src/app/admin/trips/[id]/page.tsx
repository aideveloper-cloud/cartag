import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { monthOf, toLocalInput } from "@/lib/format";
import EditForm from "./EditForm";

export const dynamic = "force-dynamic";

export default async function EditTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trip = await prisma.trip.findUnique({ where: { id }, include: { vehicle: true, employee: true } });
  if (!trip) notFound();

  const photos = [
    { name: trip.selfie, label: "รูปหน้าผู้ยืม" },
    { name: trip.photoStart, label: "เลขไมล์ตอนออก" },
    { name: trip.photoEnd, label: "เลขไมล์ตอนคืน" },
  ].filter((p) => p.name);

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <Link href={`/admin/vehicles/${trip.vehicle.code}?month=${monthOf(trip.departedAt)}`} className="text-blue-600">
        ← กลับ
      </Link>
      <h1 className="text-2xl font-bold">
        แก้ไขรายการ · <span className="bg-yellow-300 px-2">{trip.vehicle.plate}</span>
      </h1>
      {trip.employee && (
        <p className="text-sm text-gray-500">
          ยืมโดยรหัสพนักงาน {trip.employee.code}
        </p>
      )}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {photos.map((p) => (
            <a key={p.name} href={`/api/photos/${p.name}`} target="_blank" className="text-center text-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/photos/${p.name}`} alt={p.label} className="h-32 w-32 rounded object-cover" />
              {p.label}
            </a>
          ))}
        </div>
      )}
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <EditForm
          trip={{
            id: trip.id,
            driver: trip.driver,
            department: trip.department,
            origin: trip.origin,
            destination: trip.destination,
            departedAt: toLocalInput(trip.departedAt),
            returnedAt: toLocalInput(trip.returnedAt),
            mileageStart: trip.mileageStart,
            mileageEnd: trip.mileageEnd,
            warnings: trip.warnings,
          }}
        />
      </section>
    </main>
  );
}
