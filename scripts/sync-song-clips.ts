import { and, eq } from "drizzle-orm";
import { db, ensureTables } from "../src/db";
import { songClips, songs } from "../src/db/schema";
import { fetchWithRetry } from "../src/lib/bilibili";

const SEASON_MID = "661491085";
const SEASON_ID = "9529536";

interface SeasonArchive {
  bvid: string;
  title: string;
  pubdate: number;
}

function cleanDisplayTitle(raw: string): string {
  return raw
    .replace(/^[【\[][^】\]]+[】\]]\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitle(raw: string): string {
  return cleanDisplayTitle(raw).toLowerCase();
}

function stripParens(raw: string): string {
  return raw
    .replace(/[（(][^）)]*[）)]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function computeInitial(title: string): string {
  const first = title.trim()[0]?.toUpperCase() || "#";
  return /^[A-Z]$/.test(first) ? first : "#";
}

function findMatchingSong(
  videoTitle: string,
  allSongs: Array<{ id: number; title: string }>
) {
  const cleanVideo = normalizeTitle(videoTitle);
  const cleanVideoNoParens = stripParens(cleanVideo);

  // 1. Exact normalized match
  for (const s of allSongs) {
    if (normalizeTitle(s.title) === cleanVideo) return s;
  }
  // 2. Exact match ignoring parenthetical suffixes like "(feat. ...)"
  for (const s of allSongs) {
    if (stripParens(normalizeTitle(s.title)) === cleanVideoNoParens) return s;
  }
  // 3. Substring match (only when both titles are at least 2 chars to avoid false single-char matches)
  if (cleanVideoNoParens.length < 2) return null;
  const candidates = allSongs
    .filter((s) => {
      const st = stripParens(normalizeTitle(s.title));
      return (
        st.length >= 2 &&
        (cleanVideoNoParens.includes(st) || st.includes(cleanVideoNoParens))
      );
    })
    .sort((a, b) => b.title.length - a.title.length);

  return candidates[0] ?? null;
}

async function fetchSeasonArchives(): Promise<SeasonArchive[]> {
  const all: SeasonArchive[] = [];
  let pageNum = 1;
  const pageSize = 100;

  while (true) {
    const url = `https://api.bilibili.com/x/polymer/web-space/seasons_archives_list?mid=${SEASON_MID}&season_id=${SEASON_ID}&sort_reverse=false&page_num=${pageNum}&page_size=${pageSize}`;
    const res = await fetchWithRetry(url, {
      headers: {
        Origin: "https://space.bilibili.com",
        Referer: `https://space.bilibili.com/${SEASON_MID}/lists/${SEASON_ID}?type=season`,
      },
    });
    if (!res.ok) {
      throw new Error(`Season API returned HTTP ${res.status}`);
    }
    const json = (await res.json()) as {
      code: number;
      message?: string;
      data?: {
        archives?: SeasonArchive[];
        page?: { total?: number };
      };
    };
    if (json.code !== 0) {
      throw new Error(`Season API error: ${json.code} ${json.message || ""}`);
    }

    const batch = json.data?.archives || [];
    all.push(...batch);
    const total = json.data?.page?.total ?? batch.length;
    if (all.length >= total || batch.length === 0) break;
    pageNum++;
  }

  return all;
}

async function main() {
  ensureTables();
  console.log(
    `[sync-song-clips] Fetching Bilibili season ${SEASON_ID} (mid=${SEASON_MID})...`
  );

  const archives = await fetchSeasonArchives();
  const allSongs = db
    .select({ id: songs.id, title: songs.title })
    .from(songs)
    .where(eq(songs.isActive, true))
    .all();

  const nowIso = new Date().toISOString();
  let linked = 0;
  let unmatched = 0;

  for (const arc of archives) {
    let matched = findMatchingSong(arc.title, allSongs);
    if (!matched) {
      const fallbackTitle = cleanDisplayTitle(arc.title) || arc.title;
      const insertedSong = db
        .insert(songs)
        .values({
          title: fallbackTitle,
          artist: "",
          language: null,
          genre: null,
          requestTier: "免费",
          remark: "来自 B 站歌切合集",
          initial: computeInitial(fallbackTitle),
          hasClip: true,
          sourceHash: null,
          isActive: true,
          updatedAt: nowIso,
        })
        .returning({ id: songs.id, title: songs.title })
        .get();
      matched = insertedSong;
      allSongs.push(insertedSong);
      console.log(
        `[sync-song-clips] Added missing song "${insertedSong.title}" (#${insertedSong.id})`
      );
    }

    const sungAt = arc.pubdate
      ? new Date(arc.pubdate * 1000).toISOString().slice(0, 10)
      : null;

    const existing = db
      .select()
      .from(songClips)
      .where(
        and(eq(songClips.songId, matched.id), eq(songClips.bvid, arc.bvid))
      )
      .get();

    if (!existing) {
      const hasPrimary = db
        .select({ id: songClips.id })
        .from(songClips)
        .where(
          and(eq(songClips.songId, matched.id), eq(songClips.isPrimary, true))
        )
        .get();

      db.insert(songClips)
        .values({
          songId: matched.id,
          sourceType: "bilibili_bv",
          title: arc.title,
          audioUrl: null,
          bvid: arc.bvid,
          page: 1,
          startSec: 0,
          sungAt,
          isPrimary: !hasPrimary,
          status: "published",
          createdAt: nowIso,
        })
        .run();
    }

    db.update(songs)
      .set({ hasClip: true, updatedAt: nowIso })
      .where(eq(songs.id, matched.id))
      .run();

    console.log(
      `[sync-song-clips] Linked "${matched.title}" (#${matched.id}) -> ${arc.bvid}`
    );
    linked++;
  }

  console.log(
    `[sync-song-clips] Done. Total=${archives.length}, linked=${linked}, unmatched=${unmatched}.`
  );
}

main().catch((err) => {
  console.error("[sync-song-clips] Error:", err);
  process.exit(1);
});
