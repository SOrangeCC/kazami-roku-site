import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureTables } from "@/db";
import { streamStatsSnapshots } from "@/db/schema";
import { verifyAdminToken } from "@/lib/auth";
import { SITE_CONFIG } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const authError = verifyAdminToken(req);
  if (authError) return authError;

  ensureTables();
  const body = (await req.json()) as Record<string, unknown>;
  const rawRange = String(body.range_key ?? body.rangeKey ?? "all");
  const rangeKey = ["all", "30d", "7d"].includes(rawRange) ? rawRange : "all";

  const recentRaw = body.recent_sessions ?? body.recentSessions;
  const recentSessionsJson = Array.isArray(recentRaw)
    ? JSON.stringify(recentRaw)
    : null;

  const nowIso = new Date().toISOString();
  const totalDanmaku =
    body.total_danmaku != null || body.totalDanmaku != null
      ? Number(body.total_danmaku ?? body.totalDanmaku)
      : null;
  const totalHours =
    body.total_hours != null || body.totalHours != null
      ? Number(body.total_hours ?? body.totalHours)
      : null;
  const danmakuPerHour =
    body.danmaku_per_hour != null || body.danmakuPerHour != null
      ? Number(body.danmaku_per_hour ?? body.danmakuPerHour)
      : totalHours && totalHours > 0 && totalDanmaku != null
      ? Number((totalDanmaku / totalHours).toFixed(1))
      : null;

  const payload = {
    rangeKey,
    followers:
      body.followers != null ? Number(body.followers) : null,
    following:
      body.following != null ? Number(body.following) : null,
    totalSessions:
      body.total_sessions != null || body.totalSessions != null
        ? Number(body.total_sessions ?? body.totalSessions)
        : null,
    totalDanmaku,
    totalHours,
    danmakuPerHour,
    recentSessionsJson,
    sourceUrl: String(body.source_url ?? body.sourceUrl ?? SITE_CONFIG.danmakusUrl),
    syncedAt: String(body.synced_at ?? body.syncedAt ?? nowIso),
  };

  const existing = db
    .select({ id: streamStatsSnapshots.id })
    .from(streamStatsSnapshots)
    .where(eq(streamStatsSnapshots.rangeKey, rangeKey))
    .get();

  if (existing) {
    db.update(streamStatsSnapshots)
      .set(payload)
      .where(eq(streamStatsSnapshots.id, existing.id))
      .run();
  } else {
    db.insert(streamStatsSnapshots).values(payload).run();
  }

  return NextResponse.json({ snapshot: payload });
}
