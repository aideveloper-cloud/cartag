import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["exceljs"],
  experimental: {
    // รูปถูกย่อฝั่งมือถือก่อนส่งแล้ว แต่เผื่อไว้สำหรับรูปที่ย่อไม่ได้
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
