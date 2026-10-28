# ระบบบันทึกการใช้รถด้วย QR Code

ติด QR ไว้ที่รถแต่ละคัน → พนักงานสแกนด้วยกล้องมือถือ (ไม่ต้องลงแอป) → กรอกฟอร์ม → แอดมินดูตาราง/ดาวน์โหลด Excel ตามแบบฟอร์ม "ตารางรายละเอียดการเดินทางและการใช้รถ"

## Stack
- **Next.js 15** (App Router + Server Actions)
- **Prisma + SQLite** (ใช้ migrations — เปลี่ยนเป็น PostgreSQL ได้)
- **Tailwind CSS**, **qrcode**, **exceljs**
- **Docker Compose + Caddy** สำหรับ deploy พร้อม HTTPS อัตโนมัติ

## การทำงาน
1. **สแกนตอนออก** → กรอกรหัสพนักงาน (ระบบแสดงชื่อ+แผนก และจำรหัสไว้ในมือถือ), สถานที่, เลขไมล์ (เติมให้จากครั้งล่าสุด), **ถ่ายรูปหน้า (บังคับ)**, รูปหน้าปัด (ไม่บังคับ)
2. **สแกนตอนคืน** → กรอกเลขไมล์หลังเดินทาง (+รูปหน้าปัด) → ระบบคำนวณระยะทาง
3. **ตรวจเลขไมล์** — ถ้าไมล์ถอยหลัง, กระโดดเกิน `MAX_TRIP_KM` จากครั้งก่อน หรือทริปยาวผิดปกติ ผู้ใช้ต้องกดยืนยัน และรายการจะขึ้นใน "รายการที่ต้องตรวจสอบ" ของแอดมิน
4. **แอดมิน** (`/admin`)
   - สถานะรถ + รายการที่ต้องตรวจสอบ
   - ตารางรายเดือนต่อคัน → **แก้ไข/ลบรายการ**, ปิดรายการที่ลืมคืนรถ, ดูรูป
   - ดาวน์โหลด Excel, พิมพ์ QR
   - **พนักงาน** — เพิ่มทีละคน หรือคัดลอก 3 คอลัมน์ (รหัส, ชื่อ, แผนก) จาก Excel มาวาง; ปิดใช้งานคนที่ลาออก

## PDPA
- รูปหน้าผู้ยืมใช้เพื่อยืนยันตัวผู้ใช้รถเท่านั้น ไม่มีการประมวลผลใบหน้า
- ลบอัตโนมัติเมื่อครบ `SELFIE_RETENTION_DAYS` (ค่าเริ่มต้น 180 วัน)
- รูปทั้งหมดเปิดดูได้เฉพาะแอดมิน

## พัฒนาในเครื่อง
```bash
npm install
cp .env.example .env        # แก้ค่าตามต้องการ
npm run db:setup            # สร้างตาราง + เพิ่มรถ 5 คัน
npm run dev                 # http://localhost:3000/admin
```
แก้ schema แล้วสร้าง migration ด้วย `npx prisma migrate dev --name <ชื่อ>`

## Deploy — cartag.kgarden.co.th (152.42.177.130)
เซิร์ฟเวอร์นี้มี Caddy รันอยู่แล้วบน 80/443 และโดเมนผ่าน Cloudflare proxy

1. **Cloudflare** → SSL/TLS → Overview → ตั้งเป็น **Full (strict)** (ถ้าเป็น Flexible จะวนลูป redirect)
2. บนเซิร์ฟเวอร์: ติดตั้ง Docker, clone โปรเจกต์ แล้วสร้าง `.env`
   ```
   BASE_URL="https://cartag.kgarden.co.th"
   ADMIN_PASSWORD="<รหัสที่เดายาก>"
   ```
3. `docker compose up -d --build` — แอปเปิดที่ `127.0.0.1:3000` (ถ้าพอร์ตชน ตั้ง `APP_PORT` ใน `.env` และแก้ใน Caddyfile ให้ตรง)
4. ต่อบล็อกใน `deploy/Caddyfile` เข้ากับ Caddyfile เดิม → `caddy validate` → `systemctl reload caddy`
   Caddy ขอใบรับรองให้เอง (Cloudflare ส่ง HTTP challenge ผ่านไปได้)
5. เข้า `https://cartag.kgarden.co.th/admin` → เพิ่มพนักงาน → **พิมพ์ QR**

ข้อมูลอยู่ที่ `./data/app.db` และรูปอยู่ที่ `./uploads/` บนเซิร์ฟเวอร์ — **สำรองสองโฟลเดอร์นี้**
อัปเดตเวอร์ชัน: `git pull && docker compose up -d --build` (migration รันอัตโนมัติตอนเริ่ม)

เซิร์ฟเวอร์ใหม่ที่ไม่มี web server: ตั้ง `DOMAIN` ใน `.env` แล้วใช้ `docker compose --profile caddy up -d --build` แทน

## ตั้งค่า (.env)
| ตัวแปร | ความหมาย | ค่าเริ่มต้น |
|---|---|---|
| `BASE_URL` | URL ที่ฝังใน QR | `http://localhost:3000` |
| `DOMAIN` | โดเมนสำหรับ HTTPS (docker compose) | – |
| `ADMIN_PASSWORD` | รหัสผ่านแอดมิน | – |
| `MAX_TRIP_KM` | ระยะทางที่ถือว่าผิดปกติ | 1000 |
| `SELFIE_RETENTION_DAYS` | เก็บรูปหน้ากี่วัน | 180 |

## เพิ่ม/แก้ทะเบียนรถ
- เพิ่ม: ต่อท้ายรายการใน `prisma/seed.mjs` แล้วรัน `node prisma/seed.mjs` (หรือรีสตาร์ท container)
- แก้ทะเบียน: `npx prisma studio` → ตาราง Vehicle ช่อง `plate` (รหัสใน QR คือ `v1`, `v2`, ... จึงไม่ต้องพิมพ์ QR ใหม่)
