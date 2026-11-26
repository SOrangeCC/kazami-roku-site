import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureTables } from "@/db";
import { fanCreations } from "@/db/schema";
import { verifyAdminToken } from "@/lib/auth";
import { downloadAndCacheImage } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const authError = verifyAdminToken(req);
  if (authError) return authError;

  ensureTables();
  const body = (await req.json()) as {
    type?: "art" | "clip";
    title?: string;
    author_name?: string;
    author_uid?: string;
    source_url?: string;
    thumb_url?: string;
    tags?: string[];
    published_at?: string;
    status?: "pending" | "approved" | "hidden";
  };

  if (!body.title || !body.author_name || !body.source_url || !body.thumb_url) {
    return NextResponse.json(
      { error: "title, author_name, source_url, and thumb_url are required" },
      { status: 400 }
    );
  }

  let cachedThumb = body.thumb_url;
  if (cachedThumb.startsWith("http")) {
    try {
      cachedThumb = await downloadAndCacheImage(cachedThumb, "creations");
    } catch {
      // Fallback to original URL
    }
  }

  const nowIso = new Date().toISOString();
  const tagsJson = body.tags ? JSON.stringify(body.tags) : null;

  const existing = db
    .select()
    .from(fanCreations)
    .where(eq(fanCreations.sourceUrl, body.source_url))
    .get();

  if (existing) {
    const updated = db
      .update(fanCreations)
      .set({
        type: body.type || existing.type,
        title: body.title,
        authorName: body.author_name,
        authorUid: body.author_uid ?? existing.authorUid,
        thumbUrl: cachedThumb,
        tags: tagsJson ?? existing.tags,
        publishedAt: body.published_at ?? existing.publishedAt,
        status: body.status ?? existing.status,
      })
      .where(eq(fanCreations.id, existing.id))
      .returning()
      .get();

    return NextResponse.json({ creation: updated });
  }

  const inserted = db
    .insert(fanCreations)
    .values({
      type: body.type === "clip" ? "clip" : "art",
      title: body.title,
      authorName: body.author_name,
      authorUid: body.author_uid ?? null,
      sourceUrl: body.source_url,
      thumbUrl: cachedThumb,
      tags: tagsJson,
      publishedAt: body.published_at || nowIso,
      status: body.status || "approved",
      createdAt: nowIso,
    })
    .returning()
    .get();

  return NextResponse.json({ creation: inserted }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const authError = verifyAdminToken(req);
  if (authError) return authError;

  ensureTables();
  const body = (await req.json()) as {
    id?: number;
    status?: "pending" | "approved" | "hidden";
  };

  if (!body.id || !body.status) {
    return NextResponse.json(
      { error: "id and status are required" },
      { status: 400 }
    );
  }

  const updated = db
    .update(fanCreations)
    .set({ status: body.status })
    .where(eq(fanCreations.id, body.id))
    .returning()
    .get();

  if (!updated) {
    return NextResponse.json({ error: "Creation not found" }, { status: 404 });
  }

  return NextResponse.json({ creation: updated });
}
