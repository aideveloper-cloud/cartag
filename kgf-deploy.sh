#!/bin/bash
# =============================================================
#  KGF Deploy — ใช้บนเครื่อง dev (build ที่นี่, server แค่รัน)
#  Server: ServerKG 192.168.1.15  (Colima + Docker)
#
#  ./kgf-deploy.sh deploy  <app> [port] [app_port]   build + ส่งขึ้น + รัน
#  ./kgf-deploy.sh env     [app]                     ส่ง .env.server ขึ้นไป + restart
#  ./kgf-deploy.sh logs    [app]                     ดู log สด (Ctrl+C ออก)
#  ./kgf-deploy.sh status  [app]                     ดู container / เวอร์ชันที่มี
#  ./kgf-deploy.sh rollback [app]                    ย้อนกลับเวอร์ชันก่อนหน้า
#  ./kgf-deploy.sh restart|stop|start [app]
#  ./kgf-deploy.sh remove  [app]                     ลบโปรเจคออกจาก server (ไม่ลบ DB)
#
#  ครั้งแรกระบุ <app> [port]; ครั้งต่อไปในโฟลเดอร์เดิม รันแค่ ./kgf-deploy.sh deploy
# =============================================================
set -e
SERVER=${KGF_SERVER:-server@192.168.1.10}     # นอกออฟฟิศ: KGF_SERVER=server@100.x.x.x ./kgf-deploy.sh ...
CONF=.kgf-deploy
CMD=$1; shift || true

R(){ ssh -o ConnectTimeout=5 "$SERVER" "export PATH=/opt/homebrew/bin:/usr/local/bin:\$PATH; $1"; }
need_app(){
  [ -f $CONF ] && source $CONF
  APP=${1:-$APP}
  [ -n "$APP" ] || { echo "✖ ระบุชื่อโปรเจค เช่น ./kgf-deploy.sh $CMD eurokool"; exit 1; }
  IMG=kgf/$APP; DIR="~/server/apps/$APP"
}

case "$CMD" in
# -------------------------------------------------------------
deploy)
  need_app "$1"
  PORT=${2:-${PORT:-8001}}; APP_PORT=${3:-${APP_PORT:-8000}}
  [ -f Dockerfile ] || { echo "✖ ไม่พบ Dockerfile ในโฟลเดอร์นี้"; exit 1; }
  printf 'APP=%s\nPORT=%s\nAPP_PORT=%s\n' "$APP" "$PORT" "$APP_PORT" > $CONF
  VER=$(date +%Y%m%d-%H%M%S)

  echo "== 1/5 Build $IMG:$VER (ARM64) =="
  docker build --platform linux/arm64 -t $IMG:$VER -t $IMG:latest .

  echo "== 2/5 ส่ง image ขึ้น server =="
  docker save $IMG:$VER $IMG:latest | gzip | ssh "$SERVER" "export PATH=/opt/homebrew/bin:\$PATH; gunzip | docker load" | tail -1

  echo "== 3/5 ส่ง config =="
  R "mkdir -p $DIR && touch $DIR/.env"
  ssh "$SERVER" "cat > ~/server/apps/$APP/docker-compose.yml" <<EOF
services:
  app:
    image: $IMG:latest
    pull_policy: never
    container_name: $APP
    ports: ["$PORT:$APP_PORT"]
    env_file: [.env]
    networks: [kgf]
    restart: unless-stopped
    logging: { driver: json-file, options: { max-size: "10m", max-file: "3" } }
networks:
  kgf:
    external: true
EOF
  [ -f .env.server ] && scp -q .env.server "$SERVER:server/apps/$APP/.env" && echo "  ส่ง .env.server แล้ว"

  echo "== 4/5 รันบน server =="
  R "cd $DIR && docker compose -p $APP up -d --force-recreate"
  R "docker images $IMG --format '{{.Tag}}' | grep -v latest | sort -r | tail -n +4 | xargs -I{} docker rmi $IMG:{} >/dev/null 2>&1; docker image prune -f >/dev/null; true"

  echo "== 5/5 Health check =="
  CODE=$(R "for i in \$(seq 1 15); do c=\$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$PORT/); [ \"\$c\" != 000 ] && { echo \$c; exit 0; }; sleep 2; done; echo 000")
  if [ "$CODE" = "000" ]; then
    echo "  ⚠ แอปยังไม่ตอบที่ port $PORT — ดู log: ./kgf-deploy.sh logs"
  else
    echo "  ✔ ตอบกลับ HTTP $CODE"
  fi
  echo
  echo "เสร็จ → http://${SERVER#*@}:$PORT   (เวอร์ชัน $VER)"
  ;;
# -------------------------------------------------------------
env)
  need_app "$1"
  [ -f .env.server ] || { echo "✖ ไม่พบ .env.server"; exit 1; }
  scp -q .env.server "$SERVER:server/apps/$APP/.env"
  R "cd $DIR && docker compose -p $APP up -d --force-recreate" ;;
logs)
  need_app "$1"
  ssh -t "$SERVER" "export PATH=/opt/homebrew/bin:\$PATH; docker logs -f --tail 100 $APP" ;;
status)
  [ -f $CONF ] && source $CONF; APP=${1:-$APP}
  R "docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
  [ -n "$APP" ] && { echo; echo "เวอร์ชันของ $APP บน server:"; R "docker images kgf/$APP --format '  {{.Tag}}  {{.CreatedSince}}' | grep -v latest"; }
  true ;;
rollback)
  need_app "$1"
  R "TAGS=\$(docker images $IMG --format '{{.Tag}}' | grep -v latest | sort -r)
     NEW=\$(echo \"\$TAGS\" | sed -n 1p); PREV=\$(echo \"\$TAGS\" | sed -n 2p)
     [ -z \"\$PREV\" ] && { echo '✖ ไม่มีเวอร์ชันก่อนหน้า'; exit 1; }
     docker tag $IMG:\$PREV $IMG:latest && docker rmi $IMG:\$NEW >/dev/null
     cd $DIR && docker compose -p $APP up -d --force-recreate && echo \"✔ rollback: \$NEW → \$PREV\"" ;;
restart|stop|start)
  need_app "$1"
  R "cd $DIR && docker compose -p $APP $CMD" ;;
remove)
  need_app "$1"
  read -p "ลบ $APP ออกจาก server? (พิมพ์ชื่อโปรเจคเพื่อยืนยัน) " c
  [ "$c" = "$APP" ] || { echo "ยกเลิก"; exit 1; }
  R "cd $DIR && docker compose -p $APP down && cd .. && rm -rf $APP && docker images $IMG -q | xargs docker rmi -f >/dev/null 2>&1; true"
  rm -f $CONF; echo "✔ ลบแล้ว" ;;
# -------------------------------------------------------------
*)
  sed -n '6,15p' "$0" | sed 's/^#  //' ;;
esac
