"use client";

// ดาวน์โหลด PNG ที่มีหัวข้อ + QR + ทะเบียน (กล่องเหลือง) เหมือนการ์ดบนหน้าพิมพ์
// วาดบน canvas ในเบราว์เซอร์ ใช้ฟอนต์ไทยของหน้าเว็บ — ฝั่ง server ไม่มีฟอนต์ไทยให้วาดตัวอักษร
export default function QrDownload({ src, title, plate, filename }: { src: string; title: string; plate: string; filename: string }) {
  async function download() {
    const img = new Image();
    img.src = src;
    await img.decode();
    await document.fonts.ready;
    const font = getComputedStyle(document.body).fontFamily;

    const W = 600;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = 90 + W + 130;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#111";
    ctx.font = `500 36px ${font}`;
    ctx.fillText(title, W / 2, 50);
    ctx.drawImage(img, 0, 80, W, W);

    ctx.font = `bold 64px ${font}`;
    const boxW = Math.min(W - 40, ctx.measureText(plate).width + 60);
    const boxY = 80 + W + 10;
    ctx.fillStyle = "#fde047";
    ctx.fillRect((W - boxW) / 2, boxY, boxW, 100);
    ctx.fillStyle = "#111";
    ctx.fillText(plate, W / 2, boxY + 54, W - 60);

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = filename;
    a.click();
  }

  return (
    <button type="button" onClick={download} className="no-print mt-1 block w-full text-sm text-blue-600">
      ดาวน์โหลด PNG
    </button>
  );
}
