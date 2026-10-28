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

## Deploy บน Mac Server + Cloudflare Tunnel (cartag.kgarden.co.th)
ใช้ Cloudflare Tunnel: ไม่ต้องมี IP สาธารณะ ไม่ต้องเปิดพอร์ตที่ router และ Cloudflare จัดการ HTTPS ให้

### 1. เตรียม Mac
```bash
sudo pmset -a sleep 0 disksleep 0 autorestart 1   # ไม่หลับ + เปิดเองหลังไฟดับ
```
ติดตั้ง Node 22+ และ Homebrew ไว้ แล้ว clone โปรเจกต์

### 2. ติดตั้งแอป
```bash
cp .env.example .env    # ตั้ง BASE_URL="https://cartag.kgarden.co.th" และ ADMIN_PASSWORD
./deploy/mac/deploy.sh  # build + ติดตั้ง service (ขอรหัส sudo)
```
- แอปรันเป็น LaunchDaemon `th.co.kgarden.cartag` ที่ `127.0.0.1:3000` เริ่มเองตอนเปิดเครื่อง (ไม่ต้องล็อกอิน) และรีสตาร์ทเองถ้าล่ม
- สำรองข้อมูลทุกคืน 02:00 ไปที่ `~/Backups/cartag` เก็บ 30 วัน (`deploy/mac/backup.sh`) — **ควรเปิด Time Machine ไปดิสก์ภายนอกด้วย**
- ข้อมูลอยู่ที่ `data/app.db`, รูปที่ `uploads/`, log ที่ `data/app.log`
- อัปเดตเวอร์ชัน: `git pull && ./deploy/mac/deploy.sh`

### 3. Cloudflare Tunnel
1. Cloudflare DNS → **ลบ A record `cartag` → 152.42.177.130**
2. Cloudflare Zero Trust → Networks → Tunnels → **Create a tunnel** → Cloudflared → ตั้งชื่อ `cartag`
3. เลือก macOS แล้วรันคำสั่งที่ได้บน Mac:
   ```bash
   brew install cloudflared
   sudo cloudflared service install <TOKEN>
   ```
4. Public hostname: `cartag.kgarden.co.th` → Service `HTTP` · `127.0.0.1:3000`
5. เข้า `https://cartag.kgarden.co.th/admin` → เพิ่มพนักงาน → **พิมพ์ QR**

### คำสั่งดูแล
```bash
sudo launchctl kickstart -k system/th.co.kgarden.cartag   # รีสตาร์ทแอป
tail -f data/app.log                                       # ดู log
sudo launchctl bootout system/th.co.kgarden.cartag         # หยุดแอป
```

### ทางเลือก: Docker / Linux VPS
มี `Dockerfile` + `docker-compose.yml` (แอปเปิดที่ `127.0.0.1:3000`; ถ้าเครื่องไม่มี web server ใช้ `docker compose --profile caddy up -d --build` เพื่อเปิด Caddy + HTTPS) และ `deploy/Caddyfile` สำหรับต่อกับ Caddy ที่มีอยู่

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
