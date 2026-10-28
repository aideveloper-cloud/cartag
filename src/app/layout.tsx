import type { Metadata, Viewport } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-sarabun",
});

export const metadata: Metadata = {
  title: "บันทึกการใช้รถ",
  description: "ระบบบันทึกการเดินทางและการใช้รถด้วย QR Code",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body className={`${sarabun.variable} antialiased`}>{children}</body>
    </html>
  );
}
