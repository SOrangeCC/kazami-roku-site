import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { and, desc, eq } from "drizzle-orm";
import { db, ensureTables } from "@/db";
import { fanCreations } from "@/db/schema";
import { SITE_CONFIG } from "@/lib/constants";
import { encodeR2KeyPath, listR2Objects } from "@/lib/storage";

export const dynamic = "force-dynamic";

const ALLOWED_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

export interface GalleryItem {
  id: string;
  title: string;
  imageUrl: string;
  authorName: string;
  sourceUrl: string | null;
  isLocal: boolean;
}

export async function GET() {
  ensureTables();
  const items: GalleryItem[] = [];

  // 1. List from Cloudflare R2 when configured; fall back to public/images/gallery/
  const r2Result = await listR2Objects("gallery/").catch(() => null);
  if (r2Result) {
    for (const key of r2Result.keys) {
      const filename = path.posix.basename(key);
      const ext = path.posix.extname(filename).toLowerCase();
      if (!ALLOWED_EXTS.has(ext)) continue;
      const baseTitle = path.posix.basename(filename, ext);
      items.push({
        id: `r2-${filename}`,
        title: baseTitle,
        imageUrl: `${r2Result.publicUrl}/${encodeR2KeyPath(key)}`,
        authorName: SITE_CONFIG.streamerName,
        sourceUrl: null,
        isLocal: true,
      });
    }
  } else {
    const galleryDir = path.resolve(process.cwd(), "public/images/gallery");
    if (fs.existsSync(galleryDir)) {
      const entries = fs.readdirSync(galleryDir, { withFileTypes: true });
      const files = entries
        .filter(
          (e) =>
            e.isFile() &&
            ALLOWED_EXTS.has(path.extname(e.name).toLowerCase())
        )
        .map((e) => e.name)
        .sort();

      for (const filename of files) {
        const baseTitle = path.basename(filename, path.extname(filename));
        items.push({
          id: `local-${filename}`,
          title: baseTitle,
          imageUrl: `/images/gallery/${encodeURIComponent(filename)}`,
          authorName: SITE_CONFIG.streamerName,
          sourceUrl: null,
          isLocal: true,
        });
      }
    }
  }

  // 2. Load approved art from fan_creations
  const artRows = db
    .select()
    .from(fanCreations)
    .where(
      and(eq(fanCreations.type, "art"), eq(fanCreations.status, "approved"))
    )
    .orderBy(desc(fanCreations.publishedAt), desc(fanCreations.id))
    .all();

  for (const row of artRows) {
    items.push({
      id: `db-${row.id}`,
      title: row.title,
      imageUrl: row.thumbUrl,
      authorName: row.authorName,
      sourceUrl: row.sourceUrl,
      isLocal: false,
    });
  }

  return NextResponse.json({
    total: items.length,
    items,
  });
}
