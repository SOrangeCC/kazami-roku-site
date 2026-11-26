import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { and, desc, eq } from "drizzle-orm";
import { db, ensureTables } from "@/db";
import { fanCreations } from "@/db/schema";
import { SITE_CONFIG } from "@/lib/constants";

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

  // 1. Auto-scan public/images/gallery/
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
