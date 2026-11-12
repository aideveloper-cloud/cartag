// เพิ่มรถตั้งต้น (รถขนส่ง — กลุ่ม g_transport จาก migration 3) เฉพาะตอน DB ยังไม่มีรถเลย (รันซ้ำได้) — เป็น .mjs เพื่อให้รันด้วย node ได้ตรง ๆ ทั้งในเครื่องและใน Docker
// หลังจากนั้นเพิ่ม/แก้/ลบรถที่หน้าแอดมิน /admin/vehicles — ไม่ seed ซ้ำ เพื่อไม่ให้รถที่แก้ทะเบียนหรือลบไปแล้วกลับมา
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const plates = ["2 ฒพ 2523", "3 ฒร 2731", "84-0152", "83-8475", "3 ฒย 4338"];

if ((await prisma.vehicle.count()) === 0) {
  // สร้างทีละคันให้ createdAt เรียงตามลำดับ (หน้าแอดมินเรียงรถตาม createdAt)
  for (const [i, plate] of plates.entries()) await prisma.vehicle.create({ data: { plate, code: `v${i + 1}`, groupId: "g_transport" } });
  // รถที่เพิ่มจากหน้าแอดมินได้รหัสต่อจากนี้ (v6, ...)
  await prisma.$executeRawUnsafe(`SELECT setval('vehicle_code_seq', ${plates.length})`);
  console.log(`Seeded ${plates.length} vehicles`);
}
await prisma.$disconnect();
