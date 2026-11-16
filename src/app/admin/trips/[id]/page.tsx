import Link from "next/link";
import { notFound } from "next/navigation";
import ReadOnlyFields from "@/components/ReadOnlyFields";
import { canEdit } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { formatDate, formatReturn, formatTime, monthOf, toLocalInput } from "@/lib/format";
import EditForm from "./EditForm";

export const dynamic = "force-dynamic";

export default async function EditTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trip = await prisma.trip.findUnique({ where: { id }, include: { vehicle: true, employee: true } });
  if (!trip) notFound();
  const editable = await canEdit();

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
        {editable ? "แก้ไขรายการ" : "รายละเอียดรายการ"} · <span className="bg-yellow-300 px-2">{trip.vehicle.plate}</span>
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
        {!editable ? (
          <ReadOnlyFields
            fields={[
              ["ผู้ใช้รถ", trip.driver],
              ["แผนก", trip.department],
              ["ออกเดินทางจาก", trip.origin],
              ["สถานที่ไป", trip.destination],
              ["วันที่/เวลาออก", `${formatDate(trip.departedAt)} ${formatTime(trip.departedAt)}`],
              ["เวลาคืนรถ", formatReturn(trip.departedAt, trip.returnedAt) || "ยังไม่คืน"],
              ["เลขไมล์ก่อนเดินทาง", trip.mileageStart.toLocaleString()],
              ["เลขไมล์หลังเดินทาง", trip.mileageEnd?.toLocaleString() ?? "ยังไม่คืน"],
              ["คำเตือน", trip.warnings ?? ""],
            ]}
          />
        ) : (
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
        )}
      </section>
    </main>
  );
}
