import ExcelJS from "exceljs";
import { currentMonth, formatDate, formatReturn, formatTime, monthLabel } from "@/lib/format";
import { getTripsForMonth, getVehicleByCode } from "@/lib/trips";

const MIN_ROWS = 13; // จำนวนแถวขั้นต่ำเหมือนฟอร์มกระดาษ

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const m = new URL(req.url).searchParams.get("month");
  const month = m && /^\d{4}-\d{2}$/.test(m) ? m : currentMonth();

  const vehicle = await getVehicleByCode(code);
  if (!vehicle) return new Response("Not found", { status: 404 });
  const trips = await getTripsForMonth(vehicle.id, month);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(vehicle.plate.replace(/[\\/?*[\]:]/g, "-"), {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  ws.columns = [14, 18, 9, 20, 14, 18, 12, 14, 14, 12].map((width) => ({ width }));
  const font = { name: "TH SarabunPSK", size: 16 };
  const border = { style: "thin" as const };
  const allBorders = { top: border, left: border, bottom: border, right: border };

  ws.mergeCells("A1:J1");
  ws.getCell("A1").value = "ตารางรายละเอียดการเดินทางและการใช้รถ";
  ws.getCell("A1").font = { ...font, size: 20, bold: true };
  ws.getCell("A1").alignment = { horizontal: "center" };

  ws.getCell("A3").value = `ประจำเดือน ${monthLabel(month)}`;
  ws.getCell("A3").font = font;
  ws.mergeCells("I3:J3");
  ws.getCell("I3").value = `ทะเบียนรถ ${vehicle.plate}`;
  ws.getCell("I3").font = { ...font, bold: true };
  ws.getCell("I3").alignment = { horizontal: "center" };
  ws.getCell("I3").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };

  // หัวตาราง 2 แถว (แถว 4–5) แบบเดียวกับฟอร์มเดิม
  ws.getRow(4).values = [
    "วันที่", "สถานที่ออกเดินทาง", "", "ผู้ใช้รถ", "แผนก", "สถานที่ไป", "เวลา\nคืนรถ", "เลขไมล์", "", "ระยะทาง\nรวม/กม.",
  ];
  ws.getRow(5).values = ["", "ออกเดินทางจาก", "เวลา", "", "", "", "", "เลขไมล์\nก่อนเดินทาง", "เลขไมล์หลัง\nเดินทาง", ""];
  for (const range of ["A4:A5", "B4:C4", "D4:D5", "E4:E5", "F4:F5", "G4:G5", "H4:I4", "J4:J5"]) ws.mergeCells(range);
  for (const r of [4, 5]) {
    ws.getRow(r).height = 36;
    ws.getRow(r).eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { ...font, bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = allBorders;
    });
  }

  const rowCount = Math.max(trips.length, MIN_ROWS);
  for (let i = 0; i < rowCount; i++) {
    const t = trips[i];
    const row = ws.getRow(6 + i);
    if (t) {
      row.values = [
        formatDate(t.departedAt),
        t.origin,
        formatTime(t.departedAt),
        t.driver,
        t.department,
        t.destination,
        formatReturn(t.departedAt, t.returnedAt),
        t.mileageStart,
        t.mileageEnd ?? "",
        t.mileageEnd !== null ? t.mileageEnd - t.mileageStart : "",
      ];
    }
    for (let c = 1; c <= 10; c++) {
      const cell = row.getCell(c);
      cell.font = font;
      cell.border = allBorders;
      cell.alignment = { horizontal: "center", vertical: "middle" };
      if (c >= 8) cell.numFmt = "#,##0";
    }
  }

  const totalRow = ws.getRow(6 + rowCount);
  ws.mergeCells(`A${totalRow.number}:I${totalRow.number}`);
  totalRow.getCell(1).value = "รวม";
  totalRow.getCell(10).value = { formula: `SUM(J6:J${totalRow.number - 1})` };
  for (const c of [1, 10]) {
    const cell = totalRow.getCell(c);
    cell.font = { ...font, bold: true };
    cell.border = allBorders;
    cell.alignment = { horizontal: c === 1 ? "right" : "center" };
    cell.numFmt = "#,##0";
  }

  const buf = await wb.xlsx.writeBuffer();
  const filename = encodeURIComponent(`บันทึกการใช้รถ_${vehicle.plate}_${month}.xlsx`);
  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
    },
  });
}
