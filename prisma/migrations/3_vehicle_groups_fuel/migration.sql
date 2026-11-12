-- ประเภทรถ + กลุ่มรถ: รถที่มีอยู่ทั้งหมดเป็นรถขนส่ง (กลุ่ม "ขนส่ง")
CREATE TYPE "VehicleCategory" AS ENUM ('TRANSPORT', 'INTERNAL');

CREATE TABLE "VehicleGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "VehicleCategory" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleGroup_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VehicleGroup_name_key" ON "VehicleGroup"("name");

INSERT INTO "VehicleGroup" ("id", "name", "category", "sortOrder") VALUES
    ('g_transport', 'ขนส่ง', 'TRANSPORT', 1),
    ('g_pool', 'ส่วนกลาง', 'INTERNAL', 2),
    ('g_service', 'ช่างทีมเซอร์วิส', 'INTERNAL', 3);

ALTER TABLE "Vehicle" ADD COLUMN "groupId" TEXT NOT NULL DEFAULT 'g_transport';
ALTER TABLE "Vehicle" ALTER COLUMN "groupId" DROP DEFAULT;
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "VehicleGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- บันทึกเติมน้ำมัน
CREATE TABLE "FuelLog" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "tripId" TEXT,
    "employeeId" TEXT,
    "driver" TEXT NOT NULL,
    "department" TEXT NOT NULL DEFAULT '',
    "billDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "liters" DECIMAL(10,2) NOT NULL,
    "mileage" INTEGER NOT NULL,
    "photoCar" TEXT NOT NULL,
    "photoMileage" TEXT NOT NULL,
    "photoLive" TEXT NOT NULL,
    "photoBill" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FuelLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FuelLog_vehicleId_billDate_idx" ON "FuelLog"("vehicleId", "billDate");

ALTER TABLE "FuelLog" ADD CONSTRAINT "FuelLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FuelLog" ADD CONSTRAINT "FuelLog_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FuelLog" ADD CONSTRAINT "FuelLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
