-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Trip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "departedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "origin" TEXT NOT NULL,
    "employeeId" TEXT,
    "driver" TEXT NOT NULL,
    "department" TEXT NOT NULL DEFAULT '',
    "destination" TEXT NOT NULL,
    "mileageStart" INTEGER NOT NULL,
    "mileageEnd" INTEGER,
    "returnedAt" DATETIME,
    "photoStart" TEXT,
    "photoEnd" TEXT,
    "selfie" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Trip_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Trip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Trip" ("createdAt", "departedAt", "department", "destination", "driver", "id", "mileageEnd", "mileageStart", "origin", "photoEnd", "photoStart", "returnedAt", "vehicleId") SELECT "createdAt", "departedAt", "department", "destination", "driver", "id", "mileageEnd", "mileageStart", "origin", "photoEnd", "photoStart", "returnedAt", "vehicleId" FROM "Trip";
DROP TABLE "Trip";
ALTER TABLE "new_Trip" RENAME TO "Trip";
CREATE INDEX "Trip_vehicleId_departedAt_idx" ON "Trip"("vehicleId", "departedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Employee_code_key" ON "Employee"("code");
