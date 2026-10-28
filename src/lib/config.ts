// ระยะทางต่อทริปที่เกินนี้จะถูกเตือนให้ยืนยัน (กม.)
export const MAX_TRIP_KM = Number(process.env.MAX_TRIP_KM ?? 1000);

// เก็บรูปหน้าผู้ยืมกี่วันก่อนลบอัตโนมัติ (PDPA: ไม่เก็บเกินจำเป็น)
export const SELFIE_RETENTION_DAYS = Number(process.env.SELFIE_RETENTION_DAYS ?? 180);

// เลขไมล์รถยนต์มีไม่เกิน 7 หลัก
export const MAX_MILEAGE = 9_999_999;
