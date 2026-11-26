import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureTables } from "@/db";
import { weeklySchedules } from "@/db/schema";
import { verifyAdminToken } from "@/lib/auth";
import { downloadAndCacheImage, storageProvider } from "@/lib/storage";
import {
  parseScheduleFromUrlOrLocalPath,
  parseScheduleImage,
} from "@/lib/scheduleParser";

export async function POST(req: NextRequest) {
  const authError = verifyAdminToken(req);
  if (authError) return authError;

  ensureTables();
  const contentType = req.headers.get("content-type") || "";
  const nowIso = new Date().toISOString();

  let weekLabel: string | null = null;
  let caption: string | null = null;
  let sourceUrl: string | null = null;
  let publishedAt = nowIso;
  let isManualOverride = true;
  let storedImageUrl = "";
  let parsedJsonStr: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = (formData.get("image") || formData.get("file")) as File | null;
    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        { error: "Missing image file in multipart form-data" },
        { status: 400 }
      );
    }

    weekLabel = (formData.get("week_label") as string | null)?.trim() || null;
    caption = (formData.get("caption") as string | null)?.trim() || null;
    sourceUrl = (formData.get("source_url") as string | null)?.trim() || null;

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "image/png";
    storedImageUrl = await storageProvider.saveImageBuffer(
      "schedules",
      `${Date.now()}-${file.name || "schedule.png"}`,
      buffer,
      mimeType
    );

    const parsed = await parseScheduleImage(buffer, mimeType);
    if (parsed) {
      parsedJsonStr = JSON.stringify(parsed);
    }
  } else {
    const body = (await req.json()) as {
      week_label?: string;
      caption?: string;
      image_url?: string;
      source_url?: string;
      published_at?: string;
      is_manual_override?: boolean;
      parsed_json?: unknown;
    };

    if (!body.image_url) {
      return NextResponse.json(
        { error: "image_url is required" },
        { status: 400 }
      );
    }

    weekLabel = body.week_label ?? null;
    caption = body.caption ?? null;
    sourceUrl = body.source_url ?? null;
    publishedAt = body.published_at || nowIso;
    isManualOverride = body.is_manual_override ?? true;
    storedImageUrl = body.image_url;

    if (storedImageUrl.startsWith("http")) {
      try {
        storedImageUrl = await downloadAndCacheImage(
          storedImageUrl,
          "schedules"
        );
      } catch {
        // Keep original URL if caching fails
      }
    }

    if (body.parsed_json) {
      parsedJsonStr =
        typeof body.parsed_json === "string"
          ? body.parsed_json
          : JSON.stringify(body.parsed_json);
    } else {
      const parsed = await parseScheduleFromUrlOrLocalPath(storedImageUrl);
      if (parsed) {
        parsedJsonStr = JSON.stringify(parsed);
      }
    }
  }

  const inserted = db
    .insert(weeklySchedules)
    .values({
      opusId: null,
      weekLabel,
      caption,
      imageUrl: storedImageUrl,
      sourceUrl,
      publishedAt,
      isManualOverride,
      parsedJson: parsedJsonStr,
      createdAt: nowIso,
    })
    .returning()
    .get();

  return NextResponse.json({ schedule: inserted }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const authError = verifyAdminToken(req);
  if (authError) return authError;

  ensureTables();
  const body = (await req.json()) as {
    id?: number;
    parsed_json?: unknown;
    reparse?: boolean;
  };

  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const existing = db
    .select()
    .from(weeklySchedules)
    .where(eq(weeklySchedules.id, body.id))
    .get();

  if (!existing) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  let nextParsedJson = existing.parsedJson;
  if (body.reparse) {
    const parsed = await parseScheduleFromUrlOrLocalPath(existing.imageUrl);
    if (!parsed) {
      return NextResponse.json(
        { error: "Gemini parsing unavailable or failed (check GEMINI_API_KEY)" },
        { status: 502 }
      );
    }
    nextParsedJson = JSON.stringify(parsed);
  } else if (body.parsed_json !== undefined) {
    nextParsedJson =
      typeof body.parsed_json === "string"
        ? body.parsed_json
        : JSON.stringify(body.parsed_json);
  }

  const updated = db
    .update(weeklySchedules)
    .set({ parsedJson: nextParsedJson })
    .where(eq(weeklySchedules.id, body.id))
    .returning()
    .get();

  return NextResponse.json({ schedule: updated });
}
