import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureTables } from "@/db";
import { vstockSnapshots } from "@/db/schema";
import { verifyAdminToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const authError = verifyAdminToken(req);
  if (authError) return authError;

  ensureTables();
  const body = (await req.json()) as Record<string, unknown>;

  const price = Number(body.price);
  if (!Number.isFinite(price)) {
    return NextResponse.json(
      { error: "price must be a valid number" },
      { status: 400 }
    );
  }

  const sparklineRaw = body.sparkline_7d ?? body.sparkline7d;
  const sparklineArr = Array.isArray(sparklineRaw)
    ? sparklineRaw.map(Number).filter((n) => Number.isFinite(n))
    : [price];

  const nowIso = new Date().toISOString();
  const payload = {
    id: 1,
    name: String(body.name || "風見ロク"),
    boardTag: String(body.board_tag ?? body.boardTag ?? "V版"),
    category: String(body.category || "唱见电台"),
    price,
    changePct: Number(body.change_pct ?? body.changePct ?? 0),
    changeAmount: Number(body.change_amount ?? body.changeAmount ?? 0),
    nav: Number(body.nav ?? price),
    pb: Number(body.pb ?? 1.0),
    pbStatus: String(body.pb_status ?? body.pbStatus ?? "均衡"),
    limitLow: Number(body.limit_low ?? body.limitLow ?? 0),
    limitHigh: Number(body.limit_high ?? body.limitHigh ?? 0),
    dps: Number(body.dps ?? 0),
    dividendYield: Number(body.dividend_yield ?? body.dividendYield ?? 0),
    trades24h: Number(body.trades_24h ?? body.trades24h ?? 0),
    traders24h: Number(body.traders_24h ?? body.traders24h ?? 0),
    longRatio: Number(body.long_ratio ?? body.longRatio ?? 50),
    shortRatio: Number(body.short_ratio ?? body.shortRatio ?? 50),
    emaActivity: Number(body.ema_activity ?? body.emaActivity ?? 0),
    lives30d: Number(body.lives_30d ?? body.lives30d ?? 0),
    danmaku30d: Number(body.danmaku_30d ?? body.danmaku30d ?? 0),
    sparkline7dJson: JSON.stringify(sparklineArr),
    sourceUrl: String(
      body.source_url ??
        body.sourceUrl ??
        "https://danmakus.com/vstock?keyword=%E9%A2%A8%E8%A6%8B%E3%83%AD%E3%82%AF"
    ),
    syncedAt: String(body.synced_at ?? body.syncedAt ?? nowIso),
  };

  const existing = db
    .select({ id: vstockSnapshots.id })
    .from(vstockSnapshots)
    .where(eq(vstockSnapshots.id, 1))
    .get();

  if (existing) {
    db.update(vstockSnapshots)
      .set(payload)
      .where(eq(vstockSnapshots.id, 1))
      .run();
  } else {
    db.insert(vstockSnapshots).values(payload).run();
  }

  return NextResponse.json({ snapshot: payload });
}
