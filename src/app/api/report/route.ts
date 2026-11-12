import ExcelJS from "exceljs";
import { addFuelSheet, addSummarySheet, addTripSheet, periodSuffix, xlsxResponse } from "@/lib/excel";
import { loadReport, reportQuery } from "@/lib/report";

// Excel รีพอร์ตหลายคันไฟล์เดียว: สรุป → แต่ละคัน (ชีตการใช้รถ + ชีตเติมน้ำมัน "น้ำมัน <ทะเบียน>")
export async function GET(req: Request) {
  const { codes, period } = reportQuery(new URL(req.url).searchParams);
  if (codes.length === 0) return new Response("เลือกรถอย่างน้อย 1 คัน", { status: 400 });
  const { vehicles, fuel, summary } = await loadReport(codes, period);
  if (vehicles.length === 0) return new Response("Not found", { status: 404 });

  const wb = new ExcelJS.Workbook();
  addSummarySheet(wb, period, summary);
  for (const v of vehicles) {
    addTripSheet(wb, v.plate, v.trips, period);
    addFuelSheet(wb, v.plate, fuel.filter((f) => f.vehicleId === v.id), period, `น้ำมัน ${v.plate}`);
  }

  return xlsxResponse(wb, `รายงานการใช้รถ_${vehicles.length}คัน_${periodSuffix(period)}.xlsx`);
}
