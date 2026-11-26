import { eq } from "drizzle-orm";
import { db, ensureTables } from "../src/db";
import { weeklySchedules } from "../src/db/schema";
import { SITE_CONFIG } from "../src/lib/constants";
import { BiliDynamicItem, fetchUserDynamics } from "../src/lib/bilibili";
import { downloadAndCacheImage } from "../src/lib/storage";
import { parseScheduleFromUrlOrLocalPath } from "../src/lib/scheduleParser";

const SCHEDULE_REGEX = /周表|课表|本周安排|日程|schedule/i;

function extractPics(item: BiliDynamicItem): string[] {
  const major = item.modules?.module_dynamic?.major;
  if (!major) return [];
  if (major.opus?.pics?.length) {
    return major.opus.pics.map((p) => p.url || "").filter(Boolean);
  }
  if (major.draw?.items?.length) {
    return major.draw.items.map((d) => d.src || "").filter(Boolean);
  }
  return [];
}

function extractText(item: BiliDynamicItem): string {
  const opusTitle = item.modules?.module_dynamic?.major?.opus?.title || "";
  const opusText = item.modules?.module_dynamic?.major?.opus?.summary?.text || "";
  const descText = item.modules?.module_dynamic?.desc?.text || "";
  return [opusTitle, opusText, descText].filter(Boolean).join("\n").trim();
}

function formatWeekLabel(date: Date): string {
  const start = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - start.getTime()) / 86400000);
  const week = Math.ceil((days + start.getDay() + 1) / 7);
  return `${date.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

async function main() {
  ensureTables();
  console.log(`[sync-weekly-schedule] Fetching dynamics for UID ${SITE_CONFIG.uid}...`);

  const items = await fetchUserDynamics(SITE_CONFIG.uid);
  const recent = items.slice(0, 20);

  const isSchedulePost = (item: BiliDynamicItem) =>
    SCHEDULE_REGEX.test(extractText(item)) && extractPics(item).length > 0;

  // 1. Check pinned dynamic only if it also matches the schedule keyword filter
  let target = recent.find((item) => {
    const isPinned = item.modules?.module_tag?.text?.includes("置顶");
    return isPinned && isSchedulePost(item);
  });

  // 2. Otherwise scan in reverse chronological order for the latest matching post
  if (!target) {
    const sorted = [...recent].sort(
      (a, b) =>
        (b.modules?.module_author?.pub_ts ?? 0) -
        (a.modules?.module_author?.pub_ts ?? 0)
    );
    target = sorted.find(isSchedulePost);
  }

  if (!target) {
    console.log("[sync-weekly-schedule] No matching schedule dynamic found.");
    return;
  }

  const opusId = target.id_str;
  const existing = db
    .select()
    .from(weeklySchedules)
    .where(eq(weeklySchedules.opusId, opusId))
    .get();

  if (existing) {
    console.log(`[sync-weekly-schedule] Schedule opus ${opusId} already synced.`);
    return;
  }

  const pics = extractPics(target);
  const cachedImageUrl = await downloadAndCacheImage(pics[0], "schedules");
  const parsed = await parseScheduleFromUrlOrLocalPath(cachedImageUrl);
  const pubTs = target.modules?.module_author?.pub_ts;
  const publishedDate = pubTs ? new Date(pubTs * 1000) : new Date();
  const nowIso = new Date().toISOString();

  db.insert(weeklySchedules)
    .values({
      opusId,
      weekLabel: formatWeekLabel(publishedDate),
      caption: extractText(target).slice(0, 500) || null,
      imageUrl: cachedImageUrl,
      sourceUrl: `https://www.bilibili.com/opus/${opusId}`,
      publishedAt: publishedDate.toISOString(),
      isManualOverride: false,
      parsedJson: parsed ? JSON.stringify(parsed) : null,
      createdAt: nowIso,
    })
    .run();

  console.log(`[sync-weekly-schedule] Saved new schedule opus ${opusId}`);
}

main().catch((err) => {
  console.error("[sync-weekly-schedule] Error:", err);
  process.exit(1);
});
