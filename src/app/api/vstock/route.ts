import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureTables } from "@/db";
import { vstockSnapshots } from "@/db/schema";

export const dynamic = "force-dynamic";

const DEFAULT_SOURCE_URL =
  "https://danmakus.com/vstock?keyword=%E9%A2%A8%E8%A6%8B%E3%83%AD%E3%82%AF";

const DEFAULT_SPARKLINE = [6.49, 6.46, 6.44, 6.45, 6.42, 6.49, 6.38];

export async function GET() {
  ensureTables();
  const row = db
    .select()
    .from(vstockSnapshots)
    .where(eq(vstockSnapshots.id, 1))
    .get();

  if (!row) {
    return NextResponse.json({
      id: 1,
      name: "風見ロク",
      boardTag: "V版",
      category: "唱见电台",
      price: 6.38,
      changePct: -1.73,
      changeAmount: -0.11,
      nav: 6.38,
      pb: 1.0,
      pbStatus: "均衡",
      limitLow: 5.19,
      limitHigh: 7.79,
      dps: 0.044,
      dividendYield: 0.69,
      trades24h: 0,
      traders24h: 0,
      longRatio: 50,
      shortRatio: 50,
      emaActivity: 44926,
      lives30d: 17,
      danmaku30d: 9698,
      sparkline7d: DEFAULT_SPARKLINE,
      sourceUrl: DEFAULT_SOURCE_URL,
      syncedAt: null,
    });
  }

  let sparkline7d: number[] = DEFAULT_SPARKLINE;
  try {
    const parsed = JSON.parse(row.sparkline7dJson);
    if (Array.isArray(parsed) && parsed.length > 0) {
      sparkline7d = parsed.map(Number).filter((n) => Number.isFinite(n));
    }
  } catch {
    sparkline7d = DEFAULT_SPARKLINE;
  }

  return NextResponse.json({
    id: row.id,
    name: row.name,
    boardTag: row.boardTag,
    category: row.category,
    price: row.price,
    changePct: row.changePct,
    changeAmount: row.changeAmount,
    nav: row.nav,
    pb: row.pb,
    pbStatus: row.pbStatus,
    limitLow: row.limitLow,
    limitHigh: row.limitHigh,
    dps: row.dps,
    dividendYield: row.dividendYield,
    trades24h: row.trades24h,
    traders24h: row.traders24h,
    longRatio: row.longRatio,
    shortRatio: row.shortRatio,
    emaActivity: row.emaActivity,
    lives30d: row.lives30d,
    danmaku30d: row.danmaku30d,
    sparkline7d,
    sourceUrl: row.sourceUrl,
    syncedAt: row.syncedAt,
  });
}
