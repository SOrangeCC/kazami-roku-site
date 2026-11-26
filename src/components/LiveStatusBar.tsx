"use client";

import { useEffect, useState } from "react";
import { Radio, ExternalLink } from "lucide-react";
import { SITE_CONFIG } from "@/lib/constants";

interface LiveStatusData {
  roomId: string;
  liveStatus: number; // 0=未开播, 1=直播中, 2=轮播中
  title: string | null;
  areaName: string | null;
  onlineCount: number | null;
  updatedAt: string | null;
}

export function LiveStatusBar() {
  const [status, setStatus] = useState<LiveStatusData | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/live-status", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as LiveStatusData;
        if (active) setStatus(data);
      } catch {
        // Ignore transient network errors
      }
    };
    load();
    const timer = setInterval(load, 60_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const isLive = status?.liveStatus === 1;
  const isLoop = status?.liveStatus === 2;

  return (
    <div className="border-b border-frost bg-ice/70 text-xs text-ink backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center">
            {isLive ? (
              <span className="animate-live-dot absolute inline-flex h-2.5 w-2.5 rounded-full bg-highlight" />
            ) : null}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                isLive
                  ? "bg-highlight"
                  : isLoop
                  ? "bg-amber-400"
                  : "bg-secondary/50"
              }`}
            />
          </span>

          <span className="shrink-0 whitespace-nowrap font-semibold text-primary">
            {isLive ? "正在直播" : isLoop ? "轮播中" : "休息中"}
          </span>

          <span className="min-w-0 flex-1 truncate text-secondary">
            {status?.title
              ? `${status.title}${status.areaName ? ` · ${status.areaName}` : ""}`
              : `${SITE_CONFIG.streamerName} 的直播间`}
          </span>

          {isLive && status?.onlineCount != null && (
            <span className="hidden shrink-0 rounded-full bg-ribbon/70 px-2 py-0.5 text-[11px] font-medium text-primary sm:inline-flex">
              <Radio className="mr-1 h-3 w-3" />
              人气 {status.onlineCount.toLocaleString()}
            </span>
          )}
        </div>

        <a
          href={SITE_CONFIG.liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-medium text-primary hover:underline"
        >
          <span className="sm:hidden">直播间</span>
          <span className="hidden sm:inline">前往 B 站直播间</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
