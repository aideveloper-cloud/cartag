import { prisma } from "./db";
import { type Period, resolvePeriod } from "./format";
import { getFuelInRange } from "./trips";
import { vehicleOrder } from "./vehicles";

// พารามิเตอร์รีพอร์ต: ?v=v1&v=v2&from=...&to=...
export function reportQuery(q: URLSearchParams | Record<string, string | string[] | undefined>) {
  const get = (k: string) => (q instanceof URLSearchParams ? q.getAll(k) : [q[k] ?? []].flat());
  const codes = [...new Set(get("v").filter((c) => /^[\w-]{1,32}$/.test(c)))];
  const period = resolvePeriod({ month: get("month")[0], from: get("from")[0], to: get("to")[0] });
  return { codes, period };
}

export const reportSearch = (codes: string[], period: Period) =>
  new URLSearchParams([...codes.map((c) => ["v", c]), ["from", period.from], ["to", period.to]]).toString();

// ข้อมูลรีพอร์ตของรถที่เลือก: รายการใช้รถแยกคัน + การเติมน้ำมันรวม + สรุปต่อคัน
export async function loadReport(codes: string[], period: Period) {
  const vehicles = await prisma.vehicle.findMany({
    where: { code: { in: codes } },
    orderBy: vehicleOrder,
    include: {
      group: true,
      trips: { where: { departedAt: { gte: period.start, lt: period.end } }, orderBy: { departedAt: "asc" } },
    },
  });
  const fuel = await getFuelInRange(vehicles.map((v) => v.id), period);
  // เรียงการเติมน้ำมันตามลำดับรถก่อน แล้วตามวันที่บนบิล
  const order = new Map(vehicles.map((v, i) => [v.id, i]));
  fuel.sort((a, b) => order.get(a.vehicleId)! - order.get(b.vehicleId)! || +a.billDate - +b.billDate);

  const summary = vehicles.map((v) => {
    const fills = fuel.filter((f) => f.vehicleId === v.id);
    return {
      plate: v.plate,
      group: v.group.name,
      trips: v.trips.length,
      km: v.trips.reduce((s, t) => s + (t.mileageEnd !== null ? t.mileageEnd - t.mileageStart : 0), 0),
      fills: fills.length,
      liters: fills.reduce((s, f) => s + Number(f.liters), 0),
      amount: fills.reduce((s, f) => s + Number(f.amount), 0),
    };
  });
  return { vehicles, fuel, summary };
}
