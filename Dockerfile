FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

ENV NODE_ENV=production \
    DATABASE_URL="file:/app/data/app.db" \
    PORT=3000
# ฐานข้อมูลและรูปเก็บใน volume เพื่อไม่ให้หายเมื่ออัปเดต container
VOLUME ["/app/data", "/app/uploads"]
EXPOSE 3000

# สร้าง/อัปเดตตารางและเพิ่มรถตั้งต้นทุกครั้งที่เริ่ม (รันซ้ำได้ปลอดภัย)
CMD ["sh", "-c", "npx prisma migrate deploy && node prisma/seed.mjs && npm start"]
