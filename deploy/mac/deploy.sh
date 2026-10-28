#!/bin/bash
# ติดตั้ง/อัปเดตระบบบน Mac Server — รันซ้ำได้ทุกครั้งที่อัปเดตโค้ด
#   ./deploy/mac/deploy.sh               build + ติดตั้ง/รีสตาร์ท service (ขอรหัส sudo)
#   ./deploy/mac/deploy.sh --no-service  build อย่างเดียว (ไว้ทดสอบ)
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
LABEL="th.co.kgarden.cartag"
BACKUP_LABEL="th.co.kgarden.cartag.backup"
NODE_BIN="$(node -p process.execPath)"   # path จริงของ node (ไม่ใช่ path ชั่วคราวของ fnm/nvm)
PORT="${APP_PORT:-3000}"
export DATABASE_URL="file:$APP_DIR/data/app.db"
export NODE_ENV=production

cd "$APP_DIR"
[ -f .env ] || { echo "ไม่พบ .env — คัดลอกจาก .env.example แล้วตั้ง BASE_URL / ADMIN_PASSWORD ก่อน"; exit 1; }
grep -q '^BASE_URL="https://' .env || echo "⚠️  BASE_URL ใน .env ยังไม่ใช่ https — QR ที่พิมพ์จะชี้ไปผิดที่"
grep -q '^ADMIN_PASSWORD="\(admin1234\|change-me\)"' .env && { echo "เปลี่ยน ADMIN_PASSWORD ใน .env ก่อน"; exit 1; }

echo "==> ติดตั้ง dependencies"
npm ci --include=dev --no-audit --no-fund  # ต้องมี devDependencies ตอน build
echo "==> อัปเดตฐานข้อมูล ($DATABASE_URL)"
mkdir -p data uploads
npx prisma migrate deploy
node prisma/seed.mjs
echo "==> build"
npm run build

[ "${1:-}" = "--no-service" ] && { echo "build เสร็จ (ไม่ได้ติดตั้ง service)"; exit 0; }

# LaunchDaemon: เริ่มเองตอนเปิดเครื่อง ไม่ต้องล็อกอิน และรีสตาร์ทเองถ้าแอปล่ม
write_plist() { # $1=label $2=xml body
  sudo tee "/Library/LaunchDaemons/$1.plist" >/dev/null <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$1</string>
  <key>UserName</key><string>$(id -un)</string>
  <key>WorkingDirectory</key><string>$APP_DIR</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>HOME</key><string>$HOME</string>
    <key>NODE_ENV</key><string>production</string>
    <key>DATABASE_URL</key><string>$DATABASE_URL</string>
    <key>PATH</key><string>$(dirname "$NODE_BIN"):/usr/bin:/bin</string>
  </dict>
$2
</dict>
</plist>
PLIST
}

echo "==> ติดตั้ง service (ต้องใช้รหัส sudo)"
write_plist "$LABEL" "  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$APP_DIR/node_modules/next/dist/bin/next</string>
    <string>start</string><string>-H</string><string>127.0.0.1</string><string>-p</string><string>$PORT</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$APP_DIR/data/app.log</string>
  <key>StandardErrorPath</key><string>$APP_DIR/data/app.log</string>"

write_plist "$BACKUP_LABEL" "  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>$APP_DIR/deploy/mac/backup.sh</string></array>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>2</integer><key>Minute</key><integer>0</integer></dict>
  <key>StandardOutPath</key><string>$APP_DIR/data/backup.log</string>
  <key>StandardErrorPath</key><string>$APP_DIR/data/backup.log</string>"

for l in "$LABEL" "$BACKUP_LABEL"; do
  sudo launchctl bootout "system/$l" 2>/dev/null || true
  sudo launchctl bootstrap system "/Library/LaunchDaemons/$l.plist"
done

echo "==> รอแอปเริ่มทำงาน"
for _ in $(seq 1 30); do
  curl -fs -o /dev/null "http://127.0.0.1:$PORT/admin/login" && { echo "✓ แอปทำงานที่ http://127.0.0.1:$PORT"; exit 0; }
  sleep 1
done
echo "แอปไม่ตอบสนอง — ดู log ที่ $APP_DIR/data/app.log"; exit 1
