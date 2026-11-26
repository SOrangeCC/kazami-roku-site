import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db, ensureTables } from "@/db";
import { songClips } from "@/db/schema";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  ensureTables();
  const { id } = await context.params;
  const songId = Number(id);
  if (!Number.isInteger(songId) || songId <= 0) {
    return NextResponse.json({ error: "Invalid song id" }, { status: 400 });
  }

  const clips = db
    .select()
    .from(songClips)
    .where(
      and(eq(songClips.songId, songId), eq(songClips.status, "published"))
    )
    .orderBy(desc(songClips.isPrimary), desc(songClips.createdAt))
    .all();

  return NextResponse.json({
    songId,
    clips,
  });
}
