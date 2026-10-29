import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// ชน unique index — เช่น Trip_one_open_per_vehicle เมื่อรถมีรายการที่ยังไม่คืนอยู่แล้ว
export function isUniqueViolation(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}
