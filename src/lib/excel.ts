import ExcelJS from "exceljs";
import type { FuelLog, Trip } from "@prisma/client";
import { type Period, formatDate, formatReturn, formatTime, monthOf, periodLabel } from "./format";

const MIN_ROWS = 13; // จำนวนแถวขั้นต่ำเหมือนฟอร์มกระดาษ
const font = { name: "TH SarabunPSK", size: 16 };
const border = { style: "thin" as const };
const allBorders = { top: border, left: border, bottom: border, right: border };
const page = { paperSize: 9, orientation: "landscape" as const, fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

// ชื่อชีตห้ามมี \ / ? * [ ] : ยาวไม่เกิน 31 ตัว และห้ามซ้ำ (ไม่สนตัวพิมพ์)
// ทะเบียนต่างกันอาจได้ชื่อเดียวกันหลังแทนอักขระ เช่น "1/2 กก" กับ "1-2 กก" → เติม (2), (3), ...
function sheetName(wb: ExcelJS.Workbook, s: string) {
  const base = s.replace(/[\\/?*[\]:]/g, "-").slice(0, 31);
  const taken = new Set(wb.worksheets.map((w) => w.name.toLowerCase()));
  let name = base;
  for (let i = 2; taken.has(name.toLowerCase()); i++) name = `${base.slice(0, 31 - ` (${i})`.length)} (${i})`;
  return name;
}

function styleRow(row: ExcelJS.Row, cols: number, opts: { bold?: boolean; numFrom?: number; numFmt?: string } = {}) {
  for (let c = 1; c <= cols; c++) {
    const cell = row.getCell(c);
    cell.font = { ...font, bold: opts.bold };
    cell.border = allBorders;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    if (opts.numFrom && c >= opts.numFrom) cell.numFmt = opts.numFmt ?? "#,##0";
  }
}

// ชีตตามแบบฟอร์ม "ตารางรายละเอียดการเดินทางและการใช้รถ" ของรถหนึ่งคัน
export function addTripSheet(wb: ExcelJS.Workbook, plate: string, trips: Trip[], period: Period, name = plate) {
  const ws = wb.addWorksheet(sheetName(wb, name), { pageSetup: page });
  // B–C (ออกเดินทางจาก/เวลา) แคบลง, D (ผู้ใช้รถ) กว้างขึ้นให้ชื่อ-นามสกุลไม่ตัดบรรทัด
  ws.columns = [14, 13, 8, 30, 14, 18, 12, 14, 14, 12].map((width) => ({ width }));

  ws.mergeCells("A1:J1");
  ws.getCell("A1").value = "ตารางรายละเอียดการเดินทางและการใช้รถ";
  ws.getCell("A1").font = { ...font, size: 20, bold: true };
  ws.getCell("A1").alignment = { horizontal: "center" };

  ws.getCell("A3").value = periodLabel(period);
  ws.getCell("A3").font = font;
  ws.mergeCells("I3:J3");
  ws.getCell("I3").value = `ทะเบียนรถ ${plate}`;
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
  for (const a of ["B4", "B5", "C5"]) ws.getCell(a).font = { ...font, size: 14, bold: true };

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
  return ws;
}

// ชีตการเติมน้ำมันของรถหนึ่งคัน (เรียงตามวันที่บนบิล) — หัวแบบเดียวกับชีตการใช้รถ: ชื่อตาราง, ช่วงเวลา, ทะเบียน (เหลือง)
export function addFuelSheet(wb: ExcelJS.Workbook, plate: string, rows: FuelLog[], period: Period, name = "เติมน้ำมัน") {
  const ws = wb.addWorksheet(sheetName(wb, name), { pageSetup: page });
  const head = ["วันที่บนบิล", "บันทึกเมื่อ", "ผู้เติม", "แผนก", "ลิตร", "บาท", "เลขไมล์", "หมายเหตุ"];
  const n = head.length; // A–H
  ws.columns = [14, 20, 30, 14, 12, 14, 14, 14].map((width) => ({ width }));

  ws.mergeCells("A1:H1");
  ws.getCell("A1").value = "ตารางการเติมน้ำมัน";
  ws.getCell("A1").font = { ...font, size: 20, bold: true };
  ws.getCell("A1").alignment = { horizontal: "center" };
  ws.getCell("A3").value = periodLabel(period);
  ws.getCell("A3").font = font;
  ws.mergeCells("G3:H3");
  ws.getCell("G3").value = `ทะเบียนรถ ${plate}`;
  ws.getCell("G3").font = { ...font, bold: true };
  ws.getCell("G3").alignment = { horizontal: "center" };
  ws.getCell("G3").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };

  ws.getRow(4).values = head;
  ws.getRow(4).height = 30;
  styleRow(ws.getRow(4), n, { bold: true });
  rows.forEach((f, i) => {
    const row = ws.getRow(5 + i);
    row.values = [
      formatDate(f.billDate),
      `${formatDate(f.createdAt)} ${formatTime(f.createdAt)}`,
      f.driver,
      f.department,
      Number(f.liters),
      Number(f.amount),
      f.mileage,
      monthOf(f.billDate) !== monthOf(f.createdAt) ? "ข้ามเดือน" : "",
    ];
    styleRow(row, n);
    row.getCell(5).numFmt = "#,##0.00";
    row.getCell(6).numFmt = "#,##0.00";
    row.getCell(7).numFmt = "#,##0";
  });

  // ไม่มีบิลในช่วงนี้: แถวบอกว่าไม่มี แทนตารางว่าง
  if (rows.length === 0) {
    ws.mergeCells("A5:H5");
    ws.getCell("A5").value = "ไม่มีการเติมน้ำมันในช่วงนี้";
    styleRow(ws.getRow(5), n);
  }
  const total = ws.getRow(5 + Math.max(rows.length, 1));
  ws.mergeCells(`A${total.number}:D${total.number}`);
  total.getCell(1).value = "รวม";
  for (const [c, L] of [[5, "E"], [6, "F"]] as const) {
    total.getCell(c).value = rows.length ? { formula: `SUM(${L}5:${L}${total.number - 1})` } : 0;
  }
  styleRow(total, n, { bold: true });
  total.getCell(1).alignment = { horizontal: "right" };
  total.getCell(5).numFmt = "#,##0.00";
  total.getCell(6).numFmt = "#,##0.00";
  return ws;
}

// ชีตสรุปต่อคัน (รีพอร์ตหลายคัน)
export function addSummarySheet(
  wb: ExcelJS.Workbook,
  period: Period,
  rows: { plate: string; group: string; trips: number; km: number; fills: number; liters: number; amount: number }[],
) {
  const ws = wb.addWorksheet(sheetName(wb, "สรุป"), { pageSetup: page });
  ws.columns = [16, 20, 12, 14, 14, 14, 16].map((width) => ({ width }));
  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = "สรุปการใช้รถ";
  ws.getCell("A1").font = { ...font, size: 20, bold: true };
  ws.getCell("A1").alignment = { horizontal: "center" };
  ws.getCell("A3").value = periodLabel(period);
  ws.getCell("A3").font = font;

  ws.getRow(4).values = ["ทะเบียน", "กลุ่ม", "ใช้รถ (ครั้ง)", "ระยะทาง (กม.)", "เติมน้ำมัน (ครั้ง)", "ลิตร", "บาท"];
  styleRow(ws.getRow(4), 7, { bold: true });
  rows.forEach((r, i) => {
    const row = ws.getRow(5 + i);
    row.values = [r.plate, r.group, r.trips, r.km, r.fills, r.liters, r.amount];
    styleRow(row, 7, { numFrom: 3 });
    row.getCell(6).numFmt = "#,##0.00";
    row.getCell(7).numFmt = "#,##0.00";
  });
  const total = ws.getRow(5 + rows.length);
  total.getCell(1).value = "รวม";
  for (const c of [3, 4, 5, 6, 7]) {
    const L = String.fromCharCode(64 + c);
    total.getCell(c).value = rows.length ? { formula: `SUM(${L}5:${L}${total.number - 1})` } : 0;
  }
  styleRow(total, 7, { bold: true, numFrom: 3 });
  total.getCell(6).numFmt = "#,##0.00";
  total.getCell(7).numFmt = "#,##0.00";
  return ws;
}

export async function xlsxResponse(wb: ExcelJS.Workbook, filename: string) {
  const buf = await wb.xlsx.writeBuffer();
  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}

export const periodSuffix = (p: Period) => p.month ?? `${p.from}_${p.to}`;
