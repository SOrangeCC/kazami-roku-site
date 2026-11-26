import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureTables } from "@/db";
import { liveStatusCache } from "@/db/schema";
import { SITE_CONFIG } from "@/lib/constants";
import { fetchLiveRoomInfo } from "@/lib/bilibili";
import { downloadAndCacheImage } from "@/lib/storage";

let refreshInFlight: Promise<void> | null = null;

async function refreshLiveStatus(): Promise<void> {
  try {
    const info = await fetchLiveRoomInfo(SITE_CONFIG.roomId);
    let coverUrl = info.user_cover || info.keyframe || "";
    if (coverUrl) {
      try {
        coverUrl = await downloadAndCacheImage(coverUrl, "live");
      } catch {
        // Fallback to original URL if caching fails
      }
    }

    const nowIso = new Date().toISOString();
    const existing = db
      .select()
      .from(liveStatusCache)
      .where(eq(liveStatusCache.id, 1))
      .get();

    const values = {
      id: 1,
      roomId: SITE_CONFIG.roomId,
      liveStatus: info.live_status ?? 0,
      title: info.title || null,
      coverUrl: coverUrl || null,
      areaName: info.area_name || null,
      liveStartAt:
        info.live_time && info.live_time !== "0000-00-00 00:00:00"
          ? info.live_time
          : null,
      onlineCount: info.online ?? 0,
      updatedAt: nowIso,
    };

    if (existing) {
      db.update(liveStatusCache).set(values).where(eq(liveStatusCache.id, 1)).run();
    } else {
      db.insert(liveStatusCache).values(values).run();
    }
  } catch (err) {
    console.error("[live-status] background refresh failed:", err);
  } finally {
    refreshInFlight = null;
  }
}

export async function GET() {
  ensureTables();
  const row = db
    .select()
    .from(liveStatusCache)
    .where(eq(liveStatusCache.id, 1))
    .get();

  const isStale =
    !row ||
    Date.now() - new Date(row.updatedAt).getTime() > 120_000;

  if (isStale && !refreshInFlight) {
    refreshInFlight = refreshLiveStatus();
  }

  if (!row) {
    return NextResponse.json({
      id: 1,
      roomId: SITE_CONFIG.roomId,
      liveStatus: 0,
      title: null,
      coverUrl: null,
      areaName: null,
      liveStartAt: null,
      onlineCount: 0,
      updatedAt: null,
    });
  }

  return NextResponse.json(row);
}
