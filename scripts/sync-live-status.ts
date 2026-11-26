import { eq } from "drizzle-orm";
import { db, ensureTables } from "../src/db";
import { liveStatusCache } from "../src/db/schema";
import { SITE_CONFIG } from "../src/lib/constants";
import { fetchLiveRoomInfo } from "../src/lib/bilibili";
import { downloadAndCacheImage } from "../src/lib/storage";

async function main() {
  ensureTables();
  console.log(`[sync-live-status] Fetching room ${SITE_CONFIG.roomId}...`);

  const info = await fetchLiveRoomInfo(SITE_CONFIG.roomId);
  let coverUrl = info.user_cover || info.keyframe || "";
  if (coverUrl) {
    try {
      coverUrl = await downloadAndCacheImage(coverUrl, "live");
    } catch (err) {
      console.warn("[sync-live-status] Failed to cache cover image:", err);
    }
  }

  const nowIso = new Date().toISOString();
  const existing = db
    .select()
    .from(liveStatusCache)
    .where(eq(liveStatusCache.id, 1))
    .get();

  const payload = {
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
    db.update(liveStatusCache).set(payload).where(eq(liveStatusCache.id, 1)).run();
  } else {
    db.insert(liveStatusCache).values(payload).run();
  }

  console.log(
    `[sync-live-status] Done: status=${payload.liveStatus}, title="${payload.title}", online=${payload.onlineCount}`
  );
}

main().catch((err) => {
  console.error("[sync-live-status] Error:", err);
  process.exit(1);
});
