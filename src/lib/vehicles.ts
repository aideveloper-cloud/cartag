import type { VehicleCategory } from "@prisma/client";
import { prisma } from "./db";

// ประเภทรถ: key ใช้ใน URL (?type=transport|internal)
export const CATEGORIES = [
  { key: "transport", value: "TRANSPORT", label: "รถขนส่ง" },
  { key: "internal", value: "INTERNAL", label: "รถภายในบริษัท" },
] as const satisfies readonly { key: string; value: VehicleCategory; label: string }[];

export function categoryFromParam(p: string | null | undefined): VehicleCategory {
  return p === "internal" ? "INTERNAL" : "TRANSPORT";
}

export const categoryKey = (c: VehicleCategory) => CATEGORIES.find((x) => x.value === c)!.key;
export const categoryLabel = (c: VehicleCategory) => CATEGORIES.find((x) => x.value === c)!.label;

export function getGroups() {
  return prisma.vehicleGroup.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
}

// ลำดับรถในทุกหน้า: ตามกลุ่ม แล้วตามวันที่เพิ่ม
export const vehicleOrder = [{ group: { sortOrder: "asc" as const } }, { createdAt: "asc" as const }, { code: "asc" as const }];
