import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db, ensureTables } from "../src/db";
import { songs } from "../src/db/schema";
import { SITE_CONFIG } from "../src/lib/constants";

interface StarBotSong {
  id?: number;
  name?: string;
  title?: string;
  singer?: string;
  artist?: string;
  language?: string | null;
  style?: string | null;
  genre?: string | null;
  pay?: number | string | null;
  guard?: number | null;
  gift?: string | null;
  video?: string | null;
  remark?: string | null;
  status?: boolean;
  first?: string | null;
  request_tier?: string;
  requestTier?: string;
}

interface NormalizedSong {
  title: string;
  artist: string;
  language: string | null;
  genre: string | null;
  requestTier: string;
  remark: string | null;
  initial: string;
  isActive: boolean;
}

function computeInitial(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return "#";
  const first = trimmed[0].toUpperCase();
  if (/^[A-Z]$/.test(first)) return first;
  return "#";
}

function mapGuardToTier(item: StarBotSong): string {
  if (item.request_tier || item.requestTier) {
    return item.request_tier || item.requestTier || "免费";
  }
  if (item.guard === 1) return "舰长专属";
  if (item.guard === 2) return "提督专属";
  if (item.guard === 3) return "总督专属";
  if (item.pay != null || item.gift != null) return "付费";
  return "免费";
}

function normalizeSong(item: StarBotSong): NormalizedSong | null {
  const title = (item.name || item.title || "").trim();
  if (!title) return null;
  const artist = (item.singer || item.artist || "").trim();
  const initialRaw = (item.first || "").trim().toUpperCase();
  const initial = /^[A-Z#]$/.test(initialRaw)
    ? initialRaw
    : computeInitial(title);

  return {
    title,
    artist,
    language: item.language?.trim() || null,
    genre: (item.style || item.genre)?.trim() || null,
    requestTier: mapGuardToTier(item),
    remark: item.remark?.trim() || null,
    initial,
    isActive: item.status !== false,
  };
}

function computeHash(song: NormalizedSong): string {
  const payload = [
    song.title,
    song.artist,
    song.language || "",
    song.genre || "",
    song.requestTier,
    song.remark || "",
    song.initial,
    song.isActive ? "1" : "0",
  ].join("|");
  return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

async function fetchStarBotSongs(): Promise<NormalizedSong[]> {
  try {
    const res = await fetch("https://api.starlwr.com/songlist/getView", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://bot.starlwr.com",
        Referer: "https://bot.starlwr.com/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        url: "bot.starlwr.com",
        uid: SITE_CONFIG.uid,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.warn(`[sync-starbot-songs] StarBot API returned HTTP ${res.status}`);
      return [];
    }

    const json = (await res.json()) as {
      code?: number;
      message?: string;
      data?: { songs?: StarBotSong[] };
    };

    if (json.code !== 0 || !Array.isArray(json.data?.songs)) {
      console.warn(
        `[sync-starbot-songs] StarBot API error: code=${json.code} msg=${json.message}`
      );
      return [];
    }

    return json.data.songs
      .map(normalizeSong)
      .filter((s): s is NormalizedSong => s !== null);
  } catch (err) {
    console.warn("[sync-starbot-songs] Failed to fetch StarBot API:", err);
    return [];
  }
}

function loadSeedSongs(): NormalizedSong[] {
  const seedPath = path.resolve(process.cwd(), "scripts/seed-songs.json");
  if (!fs.existsSync(seedPath)) return [];
  const raw = fs.readFileSync(seedPath, "utf-8");
  const parsed = JSON.parse(raw) as StarBotSong[];
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map(normalizeSong)
    .filter((s): s is NormalizedSong => s !== null);
}

async function main() {
  ensureTables();
  const useSeedFlag = process.argv.includes("--seed");

  let list = useSeedFlag ? [] : await fetchStarBotSongs();
  if (list.length === 0) {
    console.log(
      "[sync-starbot-songs] Remote StarBot unavailable or empty, falling back to scripts/seed-songs.json..."
    );
    list = loadSeedSongs();
  }

  if (list.length === 0) {
    console.error("[sync-starbot-songs] No songs fetched and no seed data found.");
    process.exit(1);
  }

  const nowIso = new Date().toISOString();
  let inserted = 0;
  let updated = 0;

  for (const item of list) {
    const hash = computeHash(item);

    const existing = db
      .select()
      .from(songs)
      .where(and(eq(songs.title, item.title), eq(songs.artist, item.artist)))
      .get();

    if (!existing) {
      db.insert(songs)
        .values({
          title: item.title,
          artist: item.artist,
          language: item.language,
          genre: item.genre,
          requestTier: item.requestTier,
          remark: item.remark,
          initial: item.initial,
          hasClip: false,
          sourceHash: hash,
          isActive: item.isActive,
          updatedAt: nowIso,
        })
        .run();
      inserted++;
    } else if (existing.sourceHash !== hash || existing.isActive !== item.isActive) {
      // Only update metadata; NEVER overwrite hasClip or song_clips
      db.update(songs)
        .set({
          language: item.language,
          genre: item.genre,
          requestTier: item.requestTier,
          remark: item.remark,
          initial: item.initial,
          sourceHash: hash,
          isActive: item.isActive,
          updatedAt: nowIso,
        })
        .where(eq(songs.id, existing.id))
        .run();
      updated++;
    }
  }

  console.log(
    `[sync-starbot-songs] Synced ${list.length} songs (inserted=${inserted}, updated=${updated}).`
  );
}

main().catch((err) => {
  console.error("[sync-starbot-songs] Error:", err);
  process.exit(1);
});
