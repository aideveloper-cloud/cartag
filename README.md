# ระบบบันทึกการใช้รถด้วย QR Code

ติด QR ไว้ที่รถแต่ละคัน → พนักงานสแกนด้วยกล้องมือถือ (ไม่ต้องลงแอป) → กรอกฟอร์ม → แอดมินดูตาราง/ดาวน์โหลด Excel ตามแบบฟอร์ม "ตารางรายละเอียดการเดินทางและการใช้รถ"

## Stack
- **Next.js 15** (App Router + Server Actions)
- **Prisma + PostgreSQL** (Postgres กลางบน ServerKG) — รูปเก็บในฐานข้อมูลด้วย จึงอยู่ใน backup รายวันของ server
- **Tailwind CSS**, **qrcode**, **exceljs**
- **Docker** + `kgf-deploy.sh` (มาตรฐาน deploy ของ KGF) + **Cloudflare Tunnel** สำหรับ HTTPS

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
colima start
docker run -d --name cartag-db -p 5433:5432 -e POSTGRES_PASSWORD=dev postgres:16
npm install
cp .env.example .env
npm run db:setup            # สร้างตาราง + เพิ่มรถ 5 คัน
npm run dev                 # http://localhost:3000/admin
```
แก้ schema แล้วสร้าง migration ด้วย `npx prisma migrate dev --name <ชื่อ>`

## Deploy — ServerKG (`ServerKG.local`) + cartag.kgarden.co.th
ใช้ขั้นตอนมาตรฐานของ KGF (build บนเครื่อง dev → ส่ง image ขึ้น server ผ่าน SSH) — port **8003**

### ครั้งแรก
1. สร้าง DB บน server (ครั้งเดียว):
   ```bash
   ssh server@ServerKG.local
   docker exec -it kgf-postgres psql -U kgf -c "CREATE USER cartag WITH PASSWORD '<รหัสยาวๆ>';"
   docker exec -it kgf-postgres psql -U kgf -c "CREATE DATABASE cartag OWNER cartag;"
   ```
2. บนเครื่อง dev: `cp .env.server.example .env.server` แล้วใส่รหัส DB, `ADMIN_PASSWORD` (ไฟล์นี้ไม่ถูก commit)
3. `./kgf-deploy.sh deploy cartag 8003` — container ตั้งตารางและเพิ่มรถให้เองตอนเริ่ม
4. Cloudflare Zero Trust → Tunnels → tunnel ที่รันบน ServerKG → **Public Hostname**:
   `cartag.kgarden.co.th` → `HTTP` · `localhost:8003`
   (ถ้า cloudflared รันเป็น container ในเครือข่าย `kgf` ให้ใช้ `cartag:8000` แทน)
5. `https://cartag.kgarden.co.th/admin` → เพิ่มพนักงาน → **พิมพ์ QR**
6. เพิ่ม `8003 | cartag (DB cartag) | Cloudflare Tunnel` ในทะเบียน Port ของ DEPLOY.md

### ครั้งต่อไป
```bash
./kgf-deploy.sh deploy      # build + ส่งขึ้น + migration อัตโนมัติ
./kgf-deploy.sh logs        # ดู log
./kgf-deploy.sh rollback    # ย้อนเวอร์ชัน (ตารางที่ migration เพิ่มไปแล้วไม่ถูกย้อน)
```
ข้อมูลทั้งหมด (รวมรูป) อยู่ใน Postgres → ไม่หายเมื่อ deploy ใหม่ และอยู่ใน backup 02:00 ของ server

## ตั้งค่า (.env)
| ตัวแปร | ความหมาย | ค่าเริ่มต้น |
|---|---|---|
| `BASE_URL` | URL ที่ฝังใน QR | `http://localhost:3000` |
| `DATABASE_URL` | Postgres | – |
| `ADMIN_PASSWORD` | รหัสผ่านแอดมิน | – |
| `MAX_TRIP_KM` | ระยะทางที่ถือว่าผิดปกติ | 1000 |
| `SELFIE_RETENTION_DAYS` | เก็บรูปหน้ากี่วัน | 180 |

## เพิ่ม/แก้ทะเบียนรถ
- เพิ่ม: ต่อท้ายรายการใน `prisma/seed.mjs` แล้ว `./kgf-deploy.sh deploy` (container เพิ่มรถให้ตอนเริ่ม)
- แก้ทะเบียน: แก้ช่อง `plate` ในตาราง Vehicle ของ DB `cartag` (รหัสใน QR คือ `v1`, `v2`, ... จึงไม่ต้องพิมพ์ QR ใหม่)
