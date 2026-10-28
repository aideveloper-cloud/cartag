#!/bin/bash
# สำรองฐานข้อมูล + รูป ทุกคืน (ตั้งเวลาโดย deploy.sh) เก็บย้อนหลัง KEEP_DAYS วัน
# ควรตั้ง BACKUP_DIR ให้อยู่คนละดิสก์ เช่น external drive หรือ NAS
set -euo pipefail
APP_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$HOME/Backups/cartag}"
KEEP_DAYS="${KEEP_DAYS:-30}"
STAMP="$(date +%Y%m%d-%H%M)"

mkdir -p "$BACKUP_DIR/db" "$BACKUP_DIR/uploads"
# .backup ของ sqlite ปลอดภัยแม้แอปกำลังเขียนอยู่ (ต่างจากการ cp ไฟล์ตรง ๆ)
sqlite3 "$APP_DIR/data/app.db" ".backup '$BACKUP_DIR/db/app-$STAMP.db'"
gzip "$BACKUP_DIR/db/app-$STAMP.db"
# รูปไม่เคยถูกแก้ไข เพิ่มแค่ไฟล์ใหม่ (ไม่ใช้ --delete เพื่อให้รูปที่ลบพลาดยังกู้ได้)
rsync -a "$APP_DIR/uploads/" "$BACKUP_DIR/uploads/"
find "$BACKUP_DIR/db" -name 'app-*.db.gz' -mtime +"$KEEP_DAYS" -delete
echo "$(date '+%F %T') backup ok → $BACKUP_DIR/db/app-$STAMP.db.gz"
