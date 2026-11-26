import { eq } from "drizzle-orm";
import { db, ensureTables } from "../src/db";
import { fanCreations } from "../src/db/schema";
import { SITE_CONFIG } from "../src/lib/constants";
import { fetchUserDynamics, fetchWithRetry } from "../src/lib/bilibili";
import { downloadAndCacheImage } from "../src/lib/storage";

const SEED_BVIDS = ["BV18fs261ETH", "BV1xYykzdE2c"];

interface BiliVideoViewResponse {
  code: number;
  message?: string;
  data?: {
    bvid: string;
    title: string;
    pic: string;
    pubdate: number;
    owner?: {
      mid?: number;
      name?: string;
    };
  };
}

async function cacheOrProxyImage(url: string): Promise<string> {
  const normalized = url.startsWith("//") ? `https:${url}` : url;
  try {
    return await downloadAndCacheImage(normalized, "creations");
  } catch {
    return `/api/proxy/image?url=${encodeURIComponent(normalized)}`;
  }
}

async function syncSeedVideos(): Promise<number> {
  let addedOrUpdated = 0;
  const nowIso = new Date().toISOString();

  for (const bvid of SEED_BVIDS) {
    const sourceUrl = `https://www.bilibili.com/video/${bvid}`;
    try {
      const res = await fetchWithRetry(
        `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`
      );
      if (!res.ok) {
        console.warn(`[sync-fan-creations] Failed to fetch ${bvid}: HTTP ${res.status}`);
        continue;
      }

      const json = (await res.json()) as BiliVideoViewResponse;
      if (json.code !== 0 || !json.data) {
        console.warn(`[sync-fan-creations] Bilibili view API error for ${bvid}: ${json.code} ${json.message || ""}`);
        continue;
      }

      const video = json.data;
      const thumbUrl = await cacheOrProxyImage(video.pic);
      const publishedAt = video.pubdate
        ? new Date(video.pubdate * 1000).toISOString()
        : nowIso;

      const existing = db
        .select()
        .from(fanCreations)
        .where(eq(fanCreations.sourceUrl, sourceUrl))
        .get();

      if (existing) {
        db.update(fanCreations)
          .set({
            type: "clip",
            title: video.title,
            authorName: video.owner?.name || SITE_CONFIG.streamerName,
            authorUid: video.owner?.mid ? String(video.owner.mid) : null,
            thumbUrl,
            publishedAt,
            status: "approved",
          })
          .where(eq(fanCreations.id, existing.id))
          .run();
      } else {
        db.insert(fanCreations)
          .values({
            type: "clip",
            title: video.title,
            authorName: video.owner?.name || SITE_CONFIG.streamerName,
            authorUid: video.owner?.mid ? String(video.owner.mid) : null,
            sourceUrl,
            thumbUrl,
            tags: JSON.stringify([SITE_CONFIG.streamerName, "二创视频"]),
            publishedAt,
            status: "approved",
            createdAt: nowIso,
          })
          .run();
      }

      addedOrUpdated++;
      console.log(`[sync-fan-creations] Seeded video ${bvid}: "${video.title}"`);
    } catch (err) {
      console.warn(`[sync-fan-creations] Error seeding ${bvid}:`, err);
    }
  }

  return addedOrUpdated;
}

async function main() {
  ensureTables();
  await syncSeedVideos();

  const tagsEnv =
    process.env.FANART_TAGS || "風見ロク,iRuru,银潮project";
  const keywords = tagsEnv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const defaultStatus =
    process.env.FANART_AUTO_APPROVE === "true" ? "approved" : "pending";

  console.log(
    `[sync-fan-creations] Scanning dynamics for UID ${SITE_CONFIG.uid} with keywords: ${keywords.join(", ")}`
  );

  const items = await fetchUserDynamics(SITE_CONFIG.uid);
  const nowIso = new Date().toISOString();
  let added = 0;

  for (const item of items) {
    const major = item.modules?.module_dynamic?.major;
    const text =
      item.modules?.module_dynamic?.desc?.text ||
      major?.opus?.summary?.text ||
      "";
    const matchedTags = keywords.filter((kw) =>
      text.toLowerCase().includes(kw.toLowerCase())
    );

    let type: "art" | "clip" | null = null;
    let title = "";
    let sourceUrl = "";
    let thumbUrl = "";

    if (major?.archive?.bvid && major.archive.cover) {
      type = "clip";
      title = major.archive.title || text.slice(0, 60) || "B 站视频";
      sourceUrl = `https://www.bilibili.com/video/${major.archive.bvid}`;
      thumbUrl = major.archive.cover;
    } else if (major?.opus?.pics?.length && matchedTags.length > 0) {
      type = "art";
      title = major.opus.title || text.slice(0, 60) || "同人插画";
      sourceUrl = `https://www.bilibili.com/opus/${item.id_str}`;
      thumbUrl = major.opus.pics[0].url || "";
    } else if (major?.draw?.items?.length && matchedTags.length > 0) {
      type = "art";
      title = text.slice(0, 60) || "同人插画";
      sourceUrl = `https://www.bilibili.com/opus/${item.id_str}`;
      thumbUrl = major.draw.items[0].src || "";
    }

    if (!type || !sourceUrl || !thumbUrl) continue;

    const existing = db
      .select({ id: fanCreations.id })
      .from(fanCreations)
      .where(eq(fanCreations.sourceUrl, sourceUrl))
      .get();
    if (existing) continue;

    const cachedThumb = await cacheOrProxyImage(thumbUrl);

    const pubTs = item.modules?.module_author?.pub_ts;
    db.insert(fanCreations)
      .values({
        type,
        title,
        authorName: item.modules?.module_author?.name || SITE_CONFIG.streamerName,
        authorUid: SITE_CONFIG.uid,
        sourceUrl,
        thumbUrl: cachedThumb,
        tags: JSON.stringify(matchedTags),
        publishedAt: pubTs ? new Date(pubTs * 1000).toISOString() : nowIso,
        status: defaultStatus,
        createdAt: nowIso,
      })
      .run();
    added++;
  }

  console.log(`[sync-fan-creations] Done. Added ${added} dynamic items (status=${defaultStatus}).`);
}

main().catch((err) => {
  console.error("[sync-fan-creations] Error:", err);
  process.exit(1);
});
