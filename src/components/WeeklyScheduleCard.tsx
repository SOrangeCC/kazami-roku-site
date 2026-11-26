"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  ExternalLink,
  ImageOff,
  Maximize2,
  X,
  BellRing,
} from "lucide-react";
import type { ParsedSchedule, ScheduleSlot } from "@/lib/scheduleParser";

interface ScheduleItem {
  id: number;
  opusId: string | null;
  weekLabel: string | null;
  caption: string | null;
  imageUrl: string;
  sourceUrl: string | null;
  publishedAt: string;
  isManualOverride: boolean;
  parsedJson: string | null;
}

function getShanghaiNow(): { weekday: number; minutes: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;

  const weekdayMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };

  const weekday = weekdayMap[map.weekday] ?? 1;
  const hour = Number(map.hour) % 24;
  const minute = Number(map.minute) || 0;
  return { weekday, minutes: hour * 60 + minute };
}

function parseSlotEndMinutes(timeStr: string): number | null {
  const matches = timeStr.match(/(\d{1,2}):(\d{2})/g);
  if (!matches || matches.length === 0) return null;
  const last = matches[matches.length - 1];
  const [h, m] = last.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function formatSlotLabel(slot: ScheduleSlot): string {
  return slot.time ? `${slot.time} · ${slot.title}` : slot.title;
}

function buildStreamReminder(parsedJson: string | null): {
  headline: string;
  note: string;
} | null {
  if (!parsedJson) return null;
  let parsed: ParsedSchedule;
  try {
    parsed = JSON.parse(parsedJson) as ParsedSchedule;
  } catch {
    return null;
  }
  if (!Array.isArray(parsed.days) || parsed.days.length === 0) return null;

  const { weekday, minutes } = getShanghaiNow();
  const today = parsed.days.find((d) => d.weekday === weekday);

  if (today && today.status === "live" && today.slots.length > 0) {
    const upcoming = today.slots.find((slot) => {
      const endMin = parseSlotEndMinutes(slot.time);
      return endMin === null || endMin >= minutes;
    });
    if (upcoming) {
      const prefix =
        upcoming.period === "morning"
          ? "今早预告："
          : upcoming.period === "afternoon"
          ? "今午预告："
          : "今晚预告：";
      return {
        headline: `${prefix}${formatSlotLabel(upcoming)}`,
        note: parsed.note || "",
      };
    }
  }

  // Look ahead for the next live day within 7 days
  for (let offset = 1; offset <= 7; offset++) {
    const nextWd = ((weekday - 1 + offset) % 7) + 1;
    const nextDay = parsed.days.find((d) => d.weekday === nextWd);
    if (nextDay && nextDay.status === "live" && nextDay.slots.length > 0) {
      const firstSlot = nextDay.slots[0];
      const dayText =
        offset === 1
          ? firstSlot.period === "evening"
            ? "明晚"
            : "明天"
          : nextDay.label;
      const prefix = today?.status === "rest" ? "今日休播 · 下场预告：" : "下场预告：";
      return {
        headline: `${prefix}${dayText} ${formatSlotLabel(firstSlot)}`,
        note: parsed.note || "",
      };
    }
  }

  return null;
}

export function WeeklyScheduleCard() {
  const [latest, setLatest] = useState<ScheduleItem | null>(null);
  const [history, setHistory] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    fetch("/api/schedule/latest")
      .then((res) => res.json())
      .then((data: { latest: ScheduleItem | null; history: ScheduleItem[] }) => {
        setLatest(data.latest);
        setHistory(data.history || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const reminder = useMemo(
    () => buildStreamReminder(latest?.parsedJson ?? null),
    [latest?.parsedJson]
  );

  return (
    <section className="rounded-3xl border border-frost bg-surface p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ice text-primary">
            <Calendar className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-ink">本周直播周表</h2>
            <p className="text-xs text-secondary">
              自动同步 B 站置顶/周表动态并本地转存
            </p>
          </div>
        </div>

        {latest?.sourceUrl && (
          <a
            href={latest.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-frost px-3 py-1 text-xs font-medium text-primary hover:border-highlight"
          >
            <span>查看原动态</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* Today / Next Stream Reminder Banner */}
      {reminder && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-highlight/30 bg-ice/55 px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <BellRing className="h-4 w-4 shrink-0" />
            <span>{reminder.headline}</span>
          </div>
          <span className="text-[11px] text-secondary">
            {reminder.note ? `${reminder.note} · ` : ""}
            临时变动请以 B 站动态为准
          </span>
        </div>
      )}

      {loading ? (
        <div className="mt-4 h-64 animate-pulse rounded-2xl bg-ice/50" />
      ) : latest ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          <div className="relative overflow-hidden rounded-2xl border border-frost bg-paper lg:col-span-8">
            <img
              src={latest.imageUrl}
              alt={latest.weekLabel || "最新直播周表"}
              className="max-h-[460px] w-full cursor-zoom-in object-contain"
              onClick={() => setZoomed(true)}
            />
            <button
              type="button"
              onClick={() => setZoomed(true)}
              className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-surface/90 px-3 py-1.5 text-xs font-medium text-ink shadow backdrop-blur hover:text-primary"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>放大查看</span>
            </button>
          </div>

          <div className="flex flex-col justify-between gap-4 lg:col-span-4">
            <div className="rounded-2xl border border-frost bg-paper p-4">
              <div className="flex items-center justify-between text-xs text-secondary">
                <span>{latest.weekLabel || "最新一期"}</span>
                <span>
                  {new Date(latest.publishedAt).toLocaleDateString("zh-CN")}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink">
                {latest.caption || "本周直播安排见左侧周表图~"}
              </p>
            </div>

            {history.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-semibold text-secondary">
                  往期周表归档
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setLatest(item)}
                      className="overflow-hidden rounded-xl border border-frost bg-paper text-left transition hover:border-highlight"
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.weekLabel || "往期周表"}
                        className="h-20 w-full object-cover"
                      />
                      <div className="truncate px-2 py-1 text-[11px] text-secondary">
                        {item.weekLabel ||
                          new Date(item.publishedAt).toLocaleDateString("zh-CN")}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-frost bg-paper py-12 text-center">
          <ImageOff className="h-8 w-8 text-secondary/60" />
          <p className="mt-2 text-sm font-medium text-ink">暂无周表数据</p>
          <p className="mt-1 text-xs text-secondary">
            请运行{" "}
            <code className="rounded bg-ice px-1.5 py-0.5">
              npm run sync:schedule
            </code>{" "}
            或前往{" "}
            <a href="/admin" className="text-primary underline">
              /admin
            </a>{" "}
            手动上传周表
          </p>
        </div>
      )}

      {zoomed && latest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setZoomed(false)}
        >
          <button
            type="button"
            onClick={() => setZoomed(false)}
            className="absolute right-4 top-4 rounded-full bg-surface p-2 text-ink shadow-lg"
            aria-label="关闭大图"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={latest.imageUrl}
            alt={latest.weekLabel || "周表大图"}
            className="max-h-[90vh] max-w-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}
