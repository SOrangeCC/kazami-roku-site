import crypto from "node:crypto";
import { SITE_CONFIG } from "./constants";

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
  61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
  36, 20, 34, 44, 52,
];

let cachedBuvid: { b3: string; b4: string; fetchedAt: number } | null = null;
let cachedWbiKeys: { imgKey: string; subKey: string; fetchedAt: number } | null =
  null;

async function ensureBuvidCookies(): Promise<{ b3?: string; b4?: string }> {
  if (process.env.BILI_BUVID3) {
    return { b3: process.env.BILI_BUVID3 };
  }
  if (cachedBuvid && Date.now() - cachedBuvid.fetchedAt < 3600_000) {
    return { b3: cachedBuvid.b3, b4: cachedBuvid.b4 };
  }

  try {
    const res = await fetch("https://api.bilibili.com/x/frontend/finger/spi", {
      headers: { "User-Agent": DEFAULT_UA },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const json = (await res.json()) as {
        code: number;
        data?: { b_3?: string; b_4?: string };
      };
      if (json.code === 0 && json.data?.b_3) {
        cachedBuvid = {
          b3: json.data.b_3,
          b4: json.data.b_4 || "",
          fetchedAt: Date.now(),
        };
        return { b3: cachedBuvid.b3, b4: cachedBuvid.b4 };
      }
    }
  } catch {
    // Ignore spi errors
  }
  return {};
}

async function buildBiliHeaders(
  extraHeaders: Record<string, string> = {}
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "User-Agent": DEFAULT_UA,
    Origin: "https://space.bilibili.com",
    Referer: `https://space.bilibili.com/${SITE_CONFIG.uid}/dynamic`,
    ...extraHeaders,
  };

  const cookies: string[] = [];
  if (process.env.BILI_SESSDATA) {
    cookies.push(`SESSDATA=${process.env.BILI_SESSDATA}`);
  }
  const buvid = await ensureBuvidCookies();
  if (buvid.b3) cookies.push(`buvid3=${buvid.b3}`);
  if (buvid.b4) cookies.push(`buvid4=${buvid.b4}`);

  if (cookies.length > 0) {
    headers["Cookie"] = cookies.join("; ");
  }

  return headers;
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 2
): Promise<Response> {
  let lastError: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      const baseHeaders = await buildBiliHeaders();
      const res = await fetch(url, {
        ...options,
        headers: {
          ...baseHeaders,
          ...(options.headers as Record<string, string> | undefined),
        },
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok || res.status < 500) {
        return res;
      }
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    if (i < retries) {
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastError;
}

async function getWbiKeys(): Promise<{ imgKey: string; subKey: string } | null> {
  if (cachedWbiKeys && Date.now() - cachedWbiKeys.fetchedAt < 1800_000) {
    return { imgKey: cachedWbiKeys.imgKey, subKey: cachedWbiKeys.subKey };
  }

  try {
    const res = await fetchWithRetry("https://api.bilibili.com/x/web-interface/nav");
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { wbi_img?: { img_url?: string; sub_url?: string } };
    };
    const imgUrl = json.data?.wbi_img?.img_url || "";
    const subUrl = json.data?.wbi_img?.sub_url || "";
    const imgKey = imgUrl.slice(imgUrl.lastIndexOf("/") + 1, imgUrl.lastIndexOf("."));
    const subKey = subUrl.slice(subUrl.lastIndexOf("/") + 1, subUrl.lastIndexOf("."));
    if (imgKey && subKey) {
      cachedWbiKeys = { imgKey, subKey, fetchedAt: Date.now() };
      return { imgKey, subKey };
    }
  } catch {
    // Ignore nav fetch failure
  }
  return null;
}

function encWbi(
  params: Record<string, string | number>,
  imgKey: string,
  subKey: string
): string {
  const orig = imgKey + subKey;
  const mixinKey = MIXIN_KEY_ENC_TAB.map((n) => orig[n] || "")
    .join("")
    .slice(0, 32);

  const wts = Math.round(Date.now() / 1000);
  const fullParams: Record<string, string | number> = { ...params, wts };
  const chrFilter = /[!'()*]/g;

  const query = Object.keys(fullParams)
    .sort()
    .map((key) => {
      const value = String(fullParams[key]).replace(chrFilter, "");
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join("&");

  const wRid = crypto
    .createHash("md5")
    .update(query + mixinKey)
    .digest("hex");

  return `${query}&w_rid=${wRid}`;
}

export interface BiliLiveRoomInfo {
  room_id: number;
  live_status: number;
  title: string;
  user_cover: string;
  keyframe: string;
  area_name: string;
  live_time: string;
  online: number;
}

export async function fetchLiveRoomInfo(
  roomId = SITE_CONFIG.roomId
): Promise<BiliLiveRoomInfo> {
  const url = `https://api.live.bilibili.com/room/v1/Room/get_info?room_id=${encodeURIComponent(roomId)}`;
  const res = await fetchWithRetry(url, {
    headers: {
      Origin: "https://live.bilibili.com",
      Referer: `https://live.bilibili.com/${roomId}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Bilibili live API returned HTTP ${res.status}`);
  }
  const json = (await res.json()) as {
    code: number;
    message?: string;
    data?: BiliLiveRoomInfo;
  };
  if (json.code !== 0 || !json.data) {
    throw new Error(`Bilibili live API error: ${json.code} ${json.message || ""}`);
  }
  return json.data;
}

export interface BiliDynamicItem {
  id_str: string;
  type: string;
  modules?: {
    module_tag?: { text?: string };
    module_author?: { pub_ts?: number; name?: string };
    module_dynamic?: {
      desc?: { text?: string };
      major?: {
        type?: string;
        opus?: {
          title?: string;
          summary?: { text?: string };
          pics?: Array<{ url?: string }>;
        };
        draw?: {
          items?: Array<{ src?: string }>;
        };
        archive?: {
          bvid?: string;
          title?: string;
          cover?: string;
          jump_url?: string;
        };
      };
    };
  };
}

interface LegacyDynamicCard {
  desc?: {
    dynamic_id_str?: string;
    timestamp?: number;
    type?: number;
    user_profile?: { info?: { uname?: string } };
  };
  card?: string;
}

function parseLegacyCards(cards: LegacyDynamicCard[]): BiliDynamicItem[] {
  const items: BiliDynamicItem[] = [];
  for (const c of cards) {
    const idStr = c.desc?.dynamic_id_str;
    if (!idStr || !c.card) continue;
    try {
      const parsed = JSON.parse(c.card) as {
        item?: {
          description?: string;
          content?: string;
          title?: string;
          pictures?: Array<{ img_src?: string }>;
        };
        bvid?: string;
        title?: string;
        pic?: string;
        desc?: string;
      };

      const text =
        parsed.item?.description ||
        parsed.item?.content ||
        parsed.desc ||
        parsed.title ||
        "";
      const pics = (parsed.item?.pictures || [])
        .map((p) => p.img_src || "")
        .filter(Boolean);

      items.push({
        id_str: idStr,
        type: parsed.bvid ? "DYNAMIC_TYPE_AV" : "DYNAMIC_TYPE_DRAW",
        modules: {
          module_author: {
            pub_ts: c.desc?.timestamp,
            name: c.desc?.user_profile?.info?.uname,
          },
          module_dynamic: {
            desc: { text },
            major: parsed.bvid
              ? {
                  type: "MAJOR_TYPE_ARCHIVE",
                  archive: {
                    bvid: parsed.bvid,
                    title: parsed.title,
                    cover: parsed.pic,
                  },
                }
              : pics.length > 0
              ? {
                  type: "MAJOR_TYPE_DRAW",
                  draw: { items: pics.map((src) => ({ src })) },
                }
              : undefined,
          },
        },
      });
    } catch {
      // Skip malformed card
    }
  }
  return items;
}

export async function fetchUserDynamics(
  uid = SITE_CONFIG.uid
): Promise<BiliDynamicItem[]> {
  // 1. Try WBI-signed web-dynamic API
  try {
    const wbi = await getWbiKeys();
    const baseUrl = "https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space";
    const query = wbi
      ? encWbi({ host_mid: uid }, wbi.imgKey, wbi.subKey)
      : `host_mid=${encodeURIComponent(uid)}`;

    const res = await fetchWithRetry(`${baseUrl}?${query}`, {
      headers: {
        Origin: "https://space.bilibili.com",
        Referer: `https://space.bilibili.com/${uid}/dynamic`,
      },
    });

    if (res.ok) {
      const json = (await res.json()) as {
        code: number;
        message?: string;
        data?: { items?: BiliDynamicItem[] };
      };
      if (json.code === 0 && Array.isArray(json.data?.items)) {
        return json.data.items;
      }
      console.warn(
        `[bilibili] web-dynamic returned code=${json.code} (${json.message || ""}), trying fallback...`
      );
    } else {
      console.warn(
        `[bilibili] web-dynamic returned HTTP ${res.status}, trying space_history fallback...`
      );
    }
  } catch (err) {
    console.warn("[bilibili] web-dynamic failed, trying space_history fallback:", err);
  }

  // 2. Fallback: legacy space_history endpoint
  const fallbackUrl = `https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/space_history?host_uid=${encodeURIComponent(uid)}`;
  const fallbackRes = await fetchWithRetry(fallbackUrl, {
    headers: {
      Origin: "https://space.bilibili.com",
      Referer: `https://space.bilibili.com/${uid}/dynamic`,
    },
  });

  if (!fallbackRes.ok) {
    throw new Error(`Bilibili space_history fallback returned HTTP ${fallbackRes.status}`);
  }

  const fallbackJson = (await fallbackRes.json()) as {
    code: number;
    message?: string;
    data?: { cards?: LegacyDynamicCard[] };
  };

  if (fallbackJson.code !== 0) {
    throw new Error(
      `Bilibili space_history error: ${fallbackJson.code} ${fallbackJson.message || ""}`
    );
  }

  return parseLegacyCards(fallbackJson.data?.cards || []);
}
