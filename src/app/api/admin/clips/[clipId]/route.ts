import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, ensureTables } from "@/db";
import { songClips, songs } from "@/db/schema";
import { verifyAdminToken } from "@/lib/auth";

function syncSongHasClip(songId: number) {
  const remaining = db
    .select({ id: songClips.id })
    .from(songClips)
    .where(and(eq(songClips.songId, songId), eq(songClips.status, "published")))
    .limit(1)
    .get();

  db.update(songs)
    .set({ hasClip: Boolean(remaining), updatedAt: new Date().toISOString() })
    .where(eq(songs.id, songId))
    .run();
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ clipId: string }> }
) {
  const authError = verifyAdminToken(req);
  if (authError) return authError;

  ensureTables();
  const { clipId } = await context.params;
  const id = Number(clipId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid clipId" }, { status: 400 });
  }

  const existing = db.select().from(songClips).where(eq(songClips.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }

  db.delete(songClips).where(eq(songClips.id, id)).run();
  syncSongHasClip(existing.songId);

  return NextResponse.json({ deleted: true, id, songId: existing.songId });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ clipId: string }> }
) {
  const authError = verifyAdminToken(req);
  if (authError) return authError;

  ensureTables();
  const { clipId } = await context.params;
  const id = Number(clipId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid clipId" }, { status: 400 });
  }

  const existing = db.select().from(songClips).where(eq(songClips.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    title?: string;
    audio_url?: string;
    bvid?: string;
    page?: number;
    start_sec?: number;
    end_sec?: number;
    duration_sec?: number;
    sung_at?: string;
    is_primary?: boolean;
    status?: "draft" | "published";
  };

  if (body.is_primary) {
    db.update(songClips)
      .set({ isPrimary: false })
      .where(eq(songClips.songId, existing.songId))
      .run();
  }

  const updated = db
    .update(songClips)
    .set({
      title: body.title !== undefined ? body.title : existing.title,
      audioUrl: body.audio_url !== undefined ? body.audio_url : existing.audioUrl,
      bvid: body.bvid !== undefined ? body.bvid : existing.bvid,
      page: body.page !== undefined ? body.page : existing.page,
      startSec: body.start_sec !== undefined ? body.start_sec : existing.startSec,
      endSec: body.end_sec !== undefined ? body.end_sec : existing.endSec,
      durationSec:
        body.duration_sec !== undefined ? body.duration_sec : existing.durationSec,
      sungAt: body.sung_at !== undefined ? body.sung_at : existing.sungAt,
      isPrimary:
        body.is_primary !== undefined ? body.is_primary : existing.isPrimary,
      status: body.status !== undefined ? body.status : existing.status,
    })
    .where(eq(songClips.id, id))
    .returning()
    .get();

  syncSongHasClip(existing.songId);

  return NextResponse.json({ clip: updated });
}
