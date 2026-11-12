import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { dayOf, formatDate, formatTime, monthOf, today } from "@/lib/format";
import EditForm from "./EditForm";

export const dynamic = "force-dynamic";

// แก้ไขรายการเติมน้ำมัน — แบบเดียวกับ /admin/trips/[id]
export default async function EditFuelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fuel = await prisma.fuelLog.findUnique({ where: { id }, include: { vehicle: true, employee: true } });
  if (!fuel) notFound();

  const photos = [
    { name: fuel.photoCar, label: "รูปหน้ารถ" },
    { name: fuel.photoMileage, label: "รูปเลขไมล์" },
    { name: fuel.photoLive, label: "รูปตอนเติม" },
    { name: fuel.photoBill, label: "รูปบิล" },
  ].filter((p) => p.name);

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <Link href={`/admin/vehicles/${fuel.vehicle.code}?month=${monthOf(fuel.billDate)}#fuel`} className="text-blue-600">
        ← กลับ
      </Link>
      <h1 className="text-2xl font-bold">
        แก้ไขการเติมน้ำมัน · <span className="bg-yellow-300 px-2">{fuel.vehicle.plate}</span>
      </h1>
      <p className="text-sm text-gray-500">
        บันทึกเมื่อ {formatDate(fuel.createdAt)} {formatTime(fuel.createdAt)}
        {fuel.employee && ` · รหัสพนักงาน ${fuel.employee.code}`}
      </p>
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {photos.map((p) => (
            <a key={p.label} href={`/api/photos/${p.name}`} target="_blank" className="text-center text-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/photos/${p.name}`} alt={p.label} className="h-32 w-32 rounded object-cover" />
              {p.label}
            </a>
          ))}
        </div>
      )}
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <EditForm
          today={today()}
          fuel={{
            id: fuel.id,
            driver: fuel.driver,
            department: fuel.department,
            billDate: dayOf(fuel.billDate),
            amount: fuel.amount.toFixed(2),
            liters: fuel.liters.toFixed(2),
            mileage: fuel.mileage,
          }}
        />
      </section>
    </main>
  );
}
