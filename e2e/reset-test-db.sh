#!/bin/bash
# ล้าง DB cartag_test แล้วเริ่ม cartag-test ใหม่ — container สร้างตารางและเพิ่มรถ 5 คันให้เองตอนเริ่ม
#   ./e2e/reset-test-db.sh          ใช้ kgf/cartag:latest (เวอร์ชันที่ deploy ล่าสุด)
#   ./e2e/reset-test-db.sh test     ใช้ kgf/cartag:test   (โค้ดใหม่ก่อน deploy — ดู README หัวข้อเทส)
set -e
SERVER=${KGF_SERVER:-server@192.168.1.10}
TAG=${1:-latest}
ssh -o ConnectTimeout=5 "$SERVER" "export PATH=/opt/homebrew/bin:/usr/local/bin:\$PATH DOCKER_CONTEXT=colima; set -e
  docker exec kgf-postgres psql -U kgf -d cartag_test -qc 'DROP SCHEMA public CASCADE; CREATE SCHEMA public AUTHORIZATION cartag_test;' 2>/dev/null
  cd ~/server/apps/cartag-test && sed -i '' 's|image: kgf/cartag:.*|image: kgf/cartag:$TAG|' docker-compose.yml
  docker compose -p cartag-test up -d --force-recreate >/dev/null 2>&1
  for i in \$(seq 1 20); do docker logs cartag-test 2>&1 | grep -q 'Ready in' && break; sleep 1; done
  echo \"cartag-test พร้อม: \$(docker inspect -f '{{.Config.Image}}' cartag-test) @ :8004\""
