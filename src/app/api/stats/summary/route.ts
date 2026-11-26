import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureTables } from "@/db";
import { streamStatsSnapshots } from "@/db/schema";
import { SITE_CONFIG } from "@/lib/constants";

export async function GET(req: NextRequest) {
  ensureTables();
  const { searchParams } = new URL(req.url);
  const rawRange = searchParams.get("range") || "all";
  const rangeKey = ["all", "30d", "7d"].includes(rawRange) ? rawRange : "all";

  const snapshot = db
    .select()
    .from(streamStatsSnapshots)
    .where(eq(streamStatsSnapshots.rangeKey, rangeKey))
    .get();

  if (!snapshot) {
    return NextResponse.json({
      rangeKey,
      followers: null,
      following: null,
      totalSessions: null,
      totalDanmaku: null,
      totalHours: null,
      danmakuPerHour: null,
      recentSessions: [],
      sourceUrl: SITE_CONFIG.danmakusUrl,
      syncedAt: null,
    });
  }

  let recentSessions: unknown[] = [];
  if (snapshot.recentSessionsJson) {
    try {
      recentSessions = JSON.parse(snapshot.recentSessionsJson);
    } catch {
      recentSessions = [];
    }
  }

  return NextResponse.json({
    rangeKey: snapshot.rangeKey,
    followers: snapshot.followers,
    following: snapshot.following,
    totalSessions: snapshot.totalSessions,
    totalDanmaku: snapshot.totalDanmaku,
    totalHours: snapshot.totalHours,
    danmakuPerHour: snapshot.danmakuPerHour,
    recentSessions,
    sourceUrl: snapshot.sourceUrl,
    syncedAt: snapshot.syncedAt,
  });
}
