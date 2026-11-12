import Link from "next/link";
import type { VehicleCategory } from "@prisma/client";
import { CATEGORIES } from "@/lib/vehicles";

// แท็บ รถขนส่ง / รถภายในบริษัท — ใช้ในหน้าแรก, หน้ารถ, หน้าพิมพ์ QR
export default function CategoryTabs({ path, current }: { path: string; current: VehicleCategory }) {
  return (
    <nav className="no-print mb-4 flex gap-2 border-b">
      {CATEGORIES.map((c) => {
        const active = c.value === current;
        return (
          <Link
            key={c.key}
            href={`${path}?type=${c.key}`}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2 font-medium ${active ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-800"}`}
          >
            {c.label}
          </Link>
        );
      })}
    </nav>
  );
}
