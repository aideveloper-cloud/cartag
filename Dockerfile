# deploy ด้วย kgf-deploy.sh (ส่งโค้ดขึ้น ServerKG แล้ว build ARM64 บน server)
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
EXPOSE 8000

# ทุกครั้งที่เริ่ม: อัปเดตตารางใน Postgres + เพิ่มรถตั้งต้น (รันซ้ำได้) แล้วเปิดแอปที่ 0.0.0.0:8000
CMD ["sh", "-c", "npx prisma migrate deploy && node prisma/seed.mjs && exec npx next start -H 0.0.0.0 -p 8000"]
