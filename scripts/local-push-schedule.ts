import fs from "node:fs";
import path from "node:path";
import { SITE_CONFIG } from "../src/lib/constants";
import { BiliDynamicItem, fetchUserDynamics } from "../src/lib/bilibili";

const SCHEDULE_REGEX = /周表|课表|本周安排|日程|schedule/i;

function loadEnvFile(filename: string) {
  const fullPath = path.resolve(process.cwd(), filename);
  if (!fs.existsSync(fullPath)) return;
  const lines = fs.readFileSync(fullPath, "utf-8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx <= 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!(key in process.env) || !process.env[key]) {
      process.env[key] = val;
    }
  }
}

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
  const opusText =
    item.modules?.module_dynamic?.major?.opus?.summary?.text || "";
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
  loadEnvFile(".env");
  loadEnvFile(".env.local");

  const siteUrl = (
    process.env.SITE_URL || "https://66roku.sorange.tech"
  ).replace(/\/+$/, "");
  const adminToken = process.env.ADMIN_TOKEN?.trim();
  const forcePush = process.argv.includes("--force");

  if (!adminToken || adminToken === "change-me-to-a-strong-random-token") {
    console.error(
      "[local-push-schedule] 请先在 .env 或环境变量中配置有效的 ADMIN_TOKEN"
    );
    process.exit(1);
  }

  console.log(
    `[local-push-schedule] 正在从本地网络抓取 UID ${SITE_CONFIG.uid} 的 B 站动态...`
  );
  const items = await fetchUserDynamics(SITE_CONFIG.uid);
  const recent = items.slice(0, 20);

  const isSchedulePost = (item: BiliDynamicItem) => {
    if (extractPics(item).length === 0) return false;
    const isPinned = Boolean(item.modules?.module_tag?.text?.includes("置顶"));
    const opusTitle = item.modules?.module_dynamic?.major?.opus?.title || "";
    if (isPinned) {
      return SCHEDULE_REGEX.test(opusTitle);
    }
    return SCHEDULE_REGEX.test(extractText(item));
  };

  const sorted = [...recent].sort(
    (a, b) =>
      (b.modules?.module_author?.pub_ts ?? 0) -
      (a.modules?.module_author?.pub_ts ?? 0)
  );
  const target = sorted.find(isSchedulePost);

  if (!target) {
    console.log("[local-push-schedule] 最近 20 条动态中未找到周表图文。");
    return;
  }

  const opusId = target.id_str;
  const sourceUrl = `https://www.bilibili.com/opus/${opusId}`;

  if (!forcePush) {
    try {
      const latestRes = await fetch(`${siteUrl}/api/schedule/latest`);
      if (latestRes.ok) {
        const latestJson = (await latestRes.json()) as {
          latest?: { sourceUrl?: string | null } | null;
        };
        if (latestJson.latest?.sourceUrl === sourceUrl) {
          console.log(
            `[local-push-schedule] 线上已是最新周表 (${opusId})，跳过推送（如需强制覆盖请加 --force）。`
          );
          return;
        }
      }
    } catch {
      // Proceed if check fails
    }
  }

  const pics = extractPics(target);
  const imgUrl = pics[0].startsWith("//") ? `https:${pics[0]}` : pics[0];
  console.log(`[local-push-schedule] 下载周表图片: ${imgUrl}`);

  const imgRes = await fetch(imgUrl, {
    headers: {
      Referer: "https://www.bilibili.com/",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });
  if (!imgRes.ok) {
    throw new Error(`下载图片失败: HTTP ${imgRes.status}`);
  }

  const contentType = imgRes.headers.get("content-type") || "image/jpeg";
  const ext = contentType.includes("png")
    ? "png"
    : contentType.includes("webp")
    ? "webp"
    : "jpg";
  const imgBuffer = await imgRes.arrayBuffer();

  const pubTs = target.modules?.module_author?.pub_ts;
  const publishedDate = pubTs ? new Date(pubTs * 1000) : new Date();
  const weekLabel = formatWeekLabel(publishedDate);
  const caption = extractText(target).slice(0, 500);

  const formData = new FormData();
  formData.append(
    "image",
    new Blob([imgBuffer], { type: contentType }),
    `schedule-${opusId}.${ext}`
  );
  formData.append("week_label", weekLabel);
  if (caption) formData.append("caption", caption);
  formData.append("source_url", sourceUrl);

  console.log(`[local-push-schedule] 正在推送至 ${siteUrl}/api/admin/schedule ...`);
  const pushRes = await fetch(`${siteUrl}/api/admin/schedule`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
    body: formData,
  });

  const pushText = await pushRes.text();
  if (!pushRes.ok) {
    throw new Error(`推送失败 (HTTP ${pushRes.status}): ${pushText}`);
  }

  console.log(`[local-push-schedule] 推送成功！响应: ${pushText.slice(0, 300)}`);
}

main().catch((err) => {
  console.error("[local-push-schedule] Error:", err);
  process.exit(1);
});
