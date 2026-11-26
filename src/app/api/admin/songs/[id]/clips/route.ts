import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureTables } from "@/db";
import { songClips, songs } from "@/db/schema";
import { verifyAdminToken } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authError = verifyAdminToken(req);
  if (authError) return authError;

  ensureTables();
  const { id } = await context.params;
  const songId = Number(id);
  if (!Number.isInteger(songId) || songId <= 0) {
    return NextResponse.json({ error: "Invalid song id" }, { status: 400 });
  }

  const song = db.select().from(songs).where(eq(songs.id, songId)).get();
  if (!song) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    source_type?: string;
    title?: string;
    audio_url?: string;
    bvid?: string;
    page?: number;
    start_sec?: number;
    end_sec?: number;
    duration_sec?: number;
    sung_at?: string;
    is_primary?: boolean;
    status?: string;
  };

  const sourceType = body.source_type || "audio_url";
  if (!["audio_url", "r2_key", "bilibili_bv"].includes(sourceType)) {
    return NextResponse.json(
      { error: "source_type must be audio_url, r2_key, or bilibili_bv" },
      { status: 400 }
    );
  }

  const isPrimary = Boolean(body.is_primary);
  const status = body.status === "draft" ? "draft" : "published";
  const nowIso = new Date().toISOString();

  if (isPrimary) {
    db.update(songClips)
      .set({ isPrimary: false })
      .where(eq(songClips.songId, songId))
      .run();
  }

  const inserted = db
    .insert(songClips)
    .values({
      songId,
      sourceType,
      title: body.title ?? null,
      audioUrl: body.audio_url ?? null,
      bvid: body.bvid ?? null,
      page: body.page ?? 1,
      startSec: body.start_sec ?? 0,
      endSec: body.end_sec ?? null,
      durationSec: body.duration_sec ?? null,
      sungAt: body.sung_at ?? null,
      isPrimary,
      status,
      createdAt: nowIso,
    })
    .returning()
    .get();

  if (status === "published") {
    db.update(songs)
      .set({ hasClip: true, updatedAt: nowIso })
      .where(eq(songs.id, songId))
      .run();
  }

  return NextResponse.json({ clip: inserted }, { status: 201 });
}
