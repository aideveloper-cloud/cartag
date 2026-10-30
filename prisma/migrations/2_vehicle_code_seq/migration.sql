-- เลขรหัส QR ของรถ (v1, v2, ...) — ไม่ถอยหลัง จึงไม่ใช้เลขของรถที่ถูกลบซ้ำ (QR เก่าอาจยังติดอยู่)
CREATE SEQUENCE "vehicle_code_seq" MINVALUE 1;
-- เริ่มต่อจากรหัสที่มากที่สุดที่มีอยู่ (DB ว่าง: seed.mjs ขยับให้เองหลังใส่รถตั้งต้น)
SELECT setval('vehicle_code_seq',
  COALESCE((SELECT max(substring("code" from '^v(\d+)$')::int) FROM "Vehicle"), 1),
  EXISTS (SELECT 1 FROM "Vehicle" WHERE "code" ~ '^v\d+$'));
