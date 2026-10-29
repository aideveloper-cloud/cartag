-- รถหนึ่งคันมีรายการที่ยังไม่คืนได้ไม่เกิน 1 รายการ
-- กันกรณีหลายเครื่องกดบันทึกออกเดินทางพร้อมกัน (เช็คในโค้ดอย่างเดียวไม่พอ)
-- Prisma schema เขียน partial index ไม่ได้ จึงมีเฉพาะใน migration นี้
CREATE UNIQUE INDEX "Trip_one_open_per_vehicle" ON "Trip"("vehicleId") WHERE "mileageEnd" IS NULL;
