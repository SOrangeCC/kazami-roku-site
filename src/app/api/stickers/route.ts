import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

const ALLOWED_EXTS = new Set([".gif", ".png", ".jpg", ".jpeg", ".webp"]);

export interface StickerItem {
  id: string;
  title: string;
  imageUrl: string;
  filename: string;
}

export async function GET() {
  const items: StickerItem[] = [];
  const stickersDir = path.resolve(process.cwd(), "public/images/stickers");

  if (fs.existsSync(stickersDir)) {
    const entries = fs.readdirSync(stickersDir, { withFileTypes: true });
    const files = entries
      .filter(
        (e) =>
          e.isFile() &&
          ALLOWED_EXTS.has(path.extname(e.name).toLowerCase())
      )
      .map((e) => e.name)
      .sort();

    for (let i = 0; i < files.length; i += 1) {
      const filename = files[i];
      items.push({
        id: `sticker-${i + 1}`,
        title: `风见ロク 表情 #${i + 1}`,
        imageUrl: `/images/stickers/${encodeURIComponent(filename)}`,
        filename,
      });
    }
  }

  return NextResponse.json({ items });
}
