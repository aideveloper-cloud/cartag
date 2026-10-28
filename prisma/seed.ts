import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const plates = ["2 ฒพ 2523", "3 ฒร 2731", "84-0152", "83-8475", "3 ฒย 4338"];

async function main() {
  for (const [i, plate] of plates.entries()) {
    await prisma.vehicle.upsert({
      where: { plate },
      update: {},
      create: { plate, code: `v${i + 1}` },
    });
  }
  console.log(`Seeded ${plates.length} vehicles`);
}

main().finally(() => prisma.$disconnect());
