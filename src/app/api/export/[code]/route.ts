import ExcelJS from "exceljs";
import { addFuelSheet, addTripSheet, periodSuffix, xlsxResponse } from "@/lib/excel";
import { resolvePeriod } from "@/lib/format";
import { getFuelInRange, getTripsInRange, getVehicleByCode } from "@/lib/trips";

// Excel ของรถหนึ่งคัน: ชีตแบบฟอร์มการใช้รถ + ชีตเติมน้ำมัน
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const q = new URL(req.url).searchParams;
  const period = resolvePeriod({ month: q.get("month"), from: q.get("from"), to: q.get("to") });

  const vehicle = await getVehicleByCode(code);
  if (!vehicle) return new Response("Not found", { status: 404 });
  const trips = await getTripsInRange(vehicle.id, period);

  const wb = new ExcelJS.Workbook();
  addTripSheet(wb, vehicle.plate, trips, period);
  addFuelSheet(wb, vehicle.plate, await getFuelInRange([vehicle.id], period), period);

  return xlsxResponse(wb, `บันทึกการใช้รถ_${vehicle.plate}_${periodSuffix(period)}.xlsx`);
}
