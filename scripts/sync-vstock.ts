import { eq } from "drizzle-orm";
import { db, ensureTables } from "../src/db";
import { streamStatsSnapshots, vstockSnapshots } from "../src/db/schema";
import { SITE_CONFIG } from "../src/lib/constants";

const VSTOCK_SOURCE_URL =
  "https://danmakus.com/vstock?keyword=%E9%A2%A8%E8%A6%8B%E3%83%AD%E3%82%AF";

const INITIAL_VSTOCK_SEED = {
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
  sparkline7dJson: JSON.stringify([6.49, 6.46, 6.44, 6.45, 6.42, 6.49, 6.38]),
  sourceUrl: VSTOCK_SOURCE_URL,
};

const INITIAL_STATS_SEED = {
  rangeKey: "all",
  followers: 1592,
  following: null,
  totalSessions: 49,
  totalDanmaku: 41023,
  totalHours: 125.3,
  danmakuPerHour: Number((41023 / 125.3).toFixed(1)),
  recentSessionsJson: JSON.stringify([]),
  sourceUrl: SITE_CONFIG.danmakusUrl,
};

async function fetchDanmakusVStock(): Promise<Record<string, unknown> | null> {
  const endpoints = [
    `https://danmakus.com/api/vstock/stock?uid=${SITE_CONFIG.uid}`,
    `https://danmakus.com/api/vstock/list?keyword=${encodeURIComponent(SITE_CONFIG.streamerName)}`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: VSTOCK_SOURCE_URL,
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        console.warn(`[sync-vstock] ${url} returned HTTP ${res.status}`);
        continue;
      }
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) continue;
      const json = (await res.json()) as { data?: Record<string, unknown> };
      if (json.data) return json.data;
    } catch (err) {
      console.warn(`[sync-vstock] Failed fetching ${url}:`, err);
    }
  }
  return null;
}

function seedIfEmpty() {
  const nowIso = new Date().toISOString();
  const existingVstock = db
    .select({ id: vstockSnapshots.id })
    .from(vstockSnapshots)
    .where(eq(vstockSnapshots.id, 1))
    .get();

  if (!existingVstock) {
    db.insert(vstockSnapshots)
      .values({ ...INITIAL_VSTOCK_SEED, syncedAt: nowIso })
      .run();
    console.log("[sync-vstock] Seeded initial vstock_snapshots (id=1).");
  } else {
    console.log("[sync-vstock] Preserved existing vstock_snapshots (id=1).");
  }

  const existingStats = db
    .select({ id: streamStatsSnapshots.id })
    .from(streamStatsSnapshots)
    .where(eq(streamStatsSnapshots.rangeKey, "all"))
    .get();

  if (!existingStats) {
    db.insert(streamStatsSnapshots)
      .values({ ...INITIAL_STATS_SEED, syncedAt: nowIso })
      .run();
    console.log("[sync-vstock] Seeded initial stream_stats_snapshots (all).");
  }
}

async function main() {
  ensureTables();
  console.log(`[sync-vstock] Checking Danmakus VStock for ${SITE_CONFIG.streamerName}...`);

  const remote = await fetchDanmakusVStock();
  if (!remote || typeof remote.price !== "number") {
    console.log(
      "[sync-vstock] Remote Danmakus VStock unavailable (e.g. Cloudflare 403); falling back gracefully."
    );
    seedIfEmpty();
    return;
  }

  const nowIso = new Date().toISOString();
  const existing = db
    .select({ id: vstockSnapshots.id })
    .from(vstockSnapshots)
    .where(eq(vstockSnapshots.id, 1))
    .get();

  const payload = {
    id: 1,
    name: String(remote.name || SITE_CONFIG.streamerName),
    boardTag: String(remote.boardTag || "V版"),
    category: String(remote.category || "唱见电台"),
    price: Number(remote.price),
    changePct: Number(remote.changePct ?? 0),
    changeAmount: Number(remote.changeAmount ?? 0),
    nav: Number(remote.nav ?? remote.price),
    pb: Number(remote.pb ?? 1.0),
    pbStatus: String(remote.pbStatus || "均衡"),
    limitLow: Number(remote.limitLow ?? 0),
    limitHigh: Number(remote.limitHigh ?? 0),
    dps: Number(remote.dps ?? 0),
    dividendYield: Number(remote.dividendYield ?? 0),
    trades24h: Number(remote.trades24h ?? 0),
    traders24h: Number(remote.traders24h ?? 0),
    longRatio: Number(remote.longRatio ?? 50),
    shortRatio: Number(remote.shortRatio ?? 50),
    emaActivity: Number(remote.emaActivity ?? 0),
    lives30d: Number(remote.lives30d ?? 0),
    danmaku30d: Number(remote.danmaku30d ?? 0),
    sparkline7dJson: JSON.stringify(
      Array.isArray(remote.sparkline7d) ? remote.sparkline7d : [Number(remote.price)]
    ),
    sourceUrl: VSTOCK_SOURCE_URL,
    syncedAt: nowIso,
  };

  if (existing) {
    db.update(vstockSnapshots).set(payload).where(eq(vstockSnapshots.id, 1)).run();
  } else {
    db.insert(vstockSnapshots).values(payload).run();
  }

  console.log(`[sync-vstock] Updated VStock snapshot: price=${payload.price}`);
}

main().catch((err) => {
  console.error("[sync-vstock] Error:", err);
  process.exit(1);
});
