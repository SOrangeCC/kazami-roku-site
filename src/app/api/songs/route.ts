import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, inArray, like, or, sql } from "drizzle-orm";
import { db, ensureTables } from "@/db";
import { songClips, songs } from "@/db/schema";

export async function GET(req: NextRequest) {
  ensureTables();
  const { searchParams } = new URL(req.url);

  const q = searchParams.get("q")?.trim() || "";
  const language = searchParams.get("language")?.trim() || "";
  const genre = searchParams.get("genre")?.trim() || "";
  const tier = searchParams.get("tier")?.trim() || "";
  const initial = searchParams.get("initial")?.trim() || "";
  const hasClip = searchParams.get("hasClip") === "1";
  const random = searchParams.get("random") === "1";

  const conditions = [eq(songs.isActive, true)];

  if (q) {
    const pattern = `%${q}%`;
    conditions.push(
      or(
        like(songs.title, pattern),
        like(songs.artist, pattern),
        like(songs.remark, pattern)
      )!
    );
  }
  if (language) conditions.push(eq(songs.language, language));
  if (genre) conditions.push(eq(songs.genre, genre));
  if (tier) conditions.push(eq(songs.requestTier, tier));
  if (initial) conditions.push(eq(songs.initial, initial.toUpperCase()));
  if (hasClip) conditions.push(eq(songs.hasClip, true));

  const matchedSongs = db
    .select()
    .from(songs)
    .where(and(...conditions))
    .orderBy(
      random ? sql`RANDOM()` : asc(songs.initial),
      asc(songs.title)
    )
    .limit(random ? 1 : 1000)
    .all();

  const songIds = matchedSongs.map((s) => s.id);
  const clipMap = new Map<number, typeof songClips.$inferSelect>();

  if (songIds.length > 0) {
    const clips = db
      .select()
      .from(songClips)
      .where(
        and(
          inArray(songClips.songId, songIds),
          eq(songClips.status, "published")
        )
      )
      .all();

    for (const clip of clips) {
      const existing = clipMap.get(clip.songId);
      if (!existing || (clip.isPrimary && !existing.isPrimary)) {
        clipMap.set(clip.songId, clip);
      }
    }
  }

  const items = matchedSongs.map((song) => ({
    ...song,
    primaryClip: clipMap.get(song.id) ?? null,
  }));

  // Compute filter facets from all active songs
  const allActive = db
    .select({
      language: songs.language,
      genre: songs.genre,
      requestTier: songs.requestTier,
      initial: songs.initial,
    })
    .from(songs)
    .where(eq(songs.isActive, true))
    .all();

  const uniqueSorted = (vals: Array<string | null>) =>
    Array.from(new Set(vals.filter((v): v is string => Boolean(v && v.trim())))).sort();

  return NextResponse.json({
    total: items.length,
    filters: {
      languages: uniqueSorted(allActive.map((r) => r.language)),
      genres: uniqueSorted(allActive.map((r) => r.genre)),
      tiers: uniqueSorted(allActive.map((r) => r.requestTier)),
      initials: uniqueSorted(allActive.map((r) => r.initial)),
    },
    items,
  });
}
