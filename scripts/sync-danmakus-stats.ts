import { eq } from "drizzle-orm";
import { db, ensureTables } from "../src/db";
import { streamStatsSnapshots } from "../src/db/schema";
import { SITE_CONFIG } from "../src/lib/constants";

interface DanmakusChannelResponse {
  channel?: {
    followers?: number;
    following?: number;
    totalLiveCount?: number;
    totalDanmakuCount?: number;
    totalLiveSecond?: number;
  };
  lives?: Array<{
    startDate?: number;
    stopDate?: number;
    title?: string;
    danmakusCount?: number;
    watchCount?: number;
    interactionCount?: number;
  }>;
}

async function fetchDanmakusData(): Promise<DanmakusChannelResponse> {
  const endpoints = [
    `https://danmakus.com/api/info/channel?uid=${SITE_CONFIG.uid}`,
    `https://uk.danmakus.com/api/info/channel?uid=${SITE_CONFIG.uid}`,
  ];

  let lastError: unknown;
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: SITE_CONFIG.danmakusUrl,
        },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status} from ${url}`);
        continue;
      }
      const json = (await res.json()) as {
        code?: number;
        data?: DanmakusChannelResponse;
      } & DanmakusChannelResponse;

      const data = json.data ?? json;
      if (data.channel || data.lives) {
        return data;
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError ?? new Error("Failed to fetch Danmakus data");
}

async function main() {
  ensureTables();
  console.log(`[sync-danmakus-stats] Fetching stats for UID ${SITE_CONFIG.uid}...`);

  const data = await fetchDanmakusData();
  const channel = data.channel || {};
  const lives = (data.lives || []).slice(0, 20);

  const totalHours = channel.totalLiveSecond
    ? Number((channel.totalLiveSecond / 3600).toFixed(2))
    : null;
  const totalDanmaku = channel.totalDanmakuCount ?? null;
  const danmakuPerHour =
    totalHours && totalHours > 0 && totalDanmaku != null
      ? Number((totalDanmaku / totalHours).toFixed(1))
      : null;

  const recentSessions = lives.map((live) => {
    const startMs = live.startDate || 0;
    const stopMs = live.stopDate || startMs;
    const durationHours =
      stopMs > startMs ? Number(((stopMs - startMs) / 3600000).toFixed(2)) : 0;
    return {
      startTime: startMs
        ? new Date(startMs).toLocaleString("zh-CN", { hour12: false })
        : "-",
      title: live.title || "直播",
      durationHours,
      danmaku: live.danmakusCount ?? 0,
      views: live.watchCount ?? 0,
      interactions: live.interactionCount ?? 0,
    };
  });

  const nowIso = new Date().toISOString();
  const existing = db
    .select()
    .from(streamStatsSnapshots)
    .where(eq(streamStatsSnapshots.rangeKey, "all"))
    .get();

  const payload = {
    rangeKey: "all",
    followers: channel.followers ?? null,
    following: channel.following ?? null,
    totalSessions: channel.totalLiveCount ?? null,
    totalDanmaku,
    totalHours,
    danmakuPerHour,
    recentSessionsJson: JSON.stringify(recentSessions),
    sourceUrl: SITE_CONFIG.danmakusUrl,
    syncedAt: nowIso,
  };

  if (existing) {
    db.update(streamStatsSnapshots)
      .set(payload)
      .where(eq(streamStatsSnapshots.id, existing.id))
      .run();
  } else {
    db.insert(streamStatsSnapshots).values(payload).run();
  }

  console.log(
    `[sync-danmakus-stats] Saved snapshot: sessions=${payload.totalSessions}, danmaku=${payload.totalDanmaku}`
  );
}

main().catch((err) => {
  console.error("[sync-danmakus-stats] Remote fetch failed:", err?.message || err);
  const existing = db
    .select({ id: streamStatsSnapshots.id })
    .from(streamStatsSnapshots)
    .where(eq(streamStatsSnapshots.rangeKey, "all"))
    .get();
  if (!existing) {
    const nowIso = new Date().toISOString();
    db.insert(streamStatsSnapshots)
      .values({
        rangeKey: "all",
        followers: 1592,
        following: null,
        totalSessions: 49,
        totalDanmaku: 41023,
        totalHours: 125.3,
        danmakuPerHour: Number((41023 / 125.3).toFixed(1)),
        recentSessionsJson: JSON.stringify([]),
        sourceUrl: SITE_CONFIG.danmakusUrl,
        syncedAt: nowIso,
      })
      .run();
    console.log("[sync-danmakus-stats] Seeded initial stream_stats_snapshots (all).");
    process.exit(0);
  }
  console.log("[sync-danmakus-stats] Existing snapshot preserved.");
  process.exit(1);
});
