import fs from "node:fs";
import path from "node:path";
import { getCacheRootDir } from "./storage";

export interface ScheduleSlot {
  period: "morning" | "afternoon" | "evening";
  title: string;
  time: string;
}

export interface ScheduleDay {
  weekday: number; // 1 (Mon) - 7 (Sun)
  label: string; // "星期一" .. "星期日"
  status: "live" | "rest";
  slots: ScheduleSlot[];
}

export interface ParsedSchedule {
  days: ScheduleDay[];
  note: string;
}

const PROMPT = `You are parsing a VTuber's weekly livestream schedule image (周表).
Extract the 7-day schedule into strict JSON with this exact schema:
{
  "days": [
    {
      "weekday": 1,
      "label": "星期一",
      "status": "live" | "rest",
      "slots": [
        { "period": "morning" | "afternoon" | "evening", "title": "...", "time": "22:00-24:00" }
      ]
    }
  ],
  "note": "bottom-left or general remark text, empty string if none"
}
Rules:
- "days" must contain 7 items for weekday 1 (星期一) through 7 (星期日).
- If a day says 休/休息/休播/无直播, set status="rest" and slots=[].
- Infer period from time if not explicit (morning <12:00, afternoon 12:00-18:00, evening >=18:00).
- Keep titles concise and faithful to the image.`;

const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
const FALLBACK_MODELS = ["gemini-3.0-flash", "gemini-2.5-flash"];

export async function parseScheduleImage(
  imageBuffer: Buffer,
  mimeType = "image/jpeg"
): Promise<ParsedSchedule | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const primaryModel =
    process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  const models = Array.from(new Set([primaryModel, ...FALLBACK_MODELS]));

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: PROMPT },
                  {
                    inlineData: {
                      mimeType,
                      data: imageBuffer.toString("base64"),
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
            },
          }),
          signal: AbortSignal.timeout(25000),
        }
      );

      if (!res.ok) {
        console.warn(
          `[scheduleParser] Model ${model} returned HTTP ${res.status}, trying next fallback...`
        );
        continue;
      }

      const json = (await res.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
      };

      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        console.warn(
          `[scheduleParser] Model ${model} returned empty text, trying next fallback...`
        );
        continue;
      }

      const parsed = JSON.parse(rawText) as ParsedSchedule;
      if (!Array.isArray(parsed.days)) {
        console.warn(
          `[scheduleParser] Model ${model} returned invalid schema, trying next fallback...`
        );
        continue;
      }

      return {
        days: parsed.days,
        note: typeof parsed.note === "string" ? parsed.note : "",
      };
    } catch (err) {
      console.warn(`[scheduleParser] Model ${model} failed:`, err);
    }
  }

  return null;
}

function guessMimeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}

export async function parseScheduleFromUrlOrLocalPath(
  imageUrl: string
): Promise<ParsedSchedule | null> {
  if (!process.env.GEMINI_API_KEY?.trim() || !imageUrl) {
    return null;
  }

  try {
    if (imageUrl.startsWith("/api/media/")) {
      const rel = imageUrl.slice("/api/media/".length);
      const cacheRoot = path.resolve(getCacheRootDir());
      const targetPath = path.resolve(cacheRoot, rel);
      if (
        targetPath.startsWith(cacheRoot + path.sep) &&
        fs.existsSync(targetPath)
      ) {
        const buffer = fs.readFileSync(targetPath);
        return parseScheduleImage(buffer, guessMimeFromPath(targetPath));
      }
    }

    if (imageUrl.startsWith("http")) {
      const res = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      const mime = res.headers.get("content-type") || "image/jpeg";
      return parseScheduleImage(buf, mime);
    }
  } catch (err) {
    console.warn("[scheduleParser] Failed to load schedule image:", err);
  }

  return null;
}
