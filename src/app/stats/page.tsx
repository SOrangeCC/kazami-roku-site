"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Clock,
  ExternalLink,
  MessageSquare,
  Tv,
  Users,
  Zap,
} from "lucide-react";
import { SITE_CONFIG } from "@/lib/constants";

interface RecentSession {
  startTime?: string;
  title?: string;
  durationHours?: number;
  danmaku?: number;
  views?: number;
  interactions?: number;
}

interface StatsResponse {
  rangeKey: "all" | "30d" | "7d";
  followers: number | null;
  following: number | null;
  totalSessions: number | null;
  totalDanmaku: number | null;
  totalHours: number | null;
  danmakuPerHour: number | null;
  recentSessions: RecentSession[];
  sourceUrl: string;
  syncedAt: string | null;
}

export default function StatsPage() {
  const [range, setRange] = useState<"all" | "30d" | "7d">("all");
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stats/summary?range=${range}`)
      .then((res) => res.json())
      .then((json: StatsResponse) => setData(json))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [range]);

  const kpis = [
    {
      label: "B 站粉丝数",
      value: data?.followers != null ? data.followers.toLocaleString() : "--",
      icon: Users,
    },
    {
      label: "直播总场次",
      value:
        data?.totalSessions != null
          ? `${data.totalSessions.toLocaleString()} 场`
          : "--",
      icon: Tv,
    },
    {
      label: "总弹幕数",
      value:
        data?.totalDanmaku != null ? data.totalDanmaku.toLocaleString() : "--",
      icon: MessageSquare,
    },
    {
      label: "累计直播时长",
      value: data?.totalHours != null ? `${data.totalHours.toFixed(1)} h` : "--",
      icon: Clock,
    },
    {
      label: "平均弹幕时速",
      value:
        data?.danmakuPerHour != null
          ? `${data.danmakuPerHour.toFixed(1)} 条/h`
          : "--",
      icon: Zap,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-frost bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ribbon text-primary">
              <BarChart3 className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-ink">直播数据汇总</h1>
              <p className="text-xs text-secondary">
                数据来源：Danmakus 频道统计
                {data?.syncedAt
                  ? ` · 最近同步 ${new Date(data.syncedAt).toLocaleString("zh-CN")}`
                  : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-full border border-frost bg-paper p-1">
              {[
                { key: "all", label: "全部" },
                { key: "30d", label: "近 30 天" },
                { key: "7d", label: "近 7 天" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setRange(tab.key as "all" | "30d" | "7d")}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    range === tab.key
                      ? "bg-ribbon text-primary"
                      : "text-secondary hover:text-ink"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <a
              href={data?.sourceUrl || SITE_CONFIG.danmakusUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-frost px-3 py-1.5 text-xs font-medium text-primary hover:border-highlight"
            >
              <span>Danmakus 原页</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl border border-frost bg-surface p-4 shadow-sm"
          >
            <div className="flex items-center gap-1.5 text-xs text-secondary">
              <Icon className="h-3.5 w-3.5 text-primary" />
              <span>{label}</span>
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-ink">
              {loading ? "..." : value}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Sessions */}
      <div className="overflow-hidden rounded-3xl border border-frost bg-surface shadow-sm">
        <div className="border-b border-frost px-6 py-4">
          <h2 className="text-base font-bold text-ink">近期直播场次明细</h2>
        </div>

        {loading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-ice/40" />
            ))}
          </div>
        ) : !data?.recentSessions || data.recentSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <BarChart3 className="h-8 w-8 text-secondary/50" />
            <p className="mt-2 text-sm font-semibold text-ink">
              暂无直播场次快照数据
            </p>
            <p className="mt-1 text-xs text-secondary">
              请运行 <code className="rounded bg-ice px-1.5 py-0.5">npm run sync:stats</code>{" "}
              同步 Danmakus 统计数据
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-frost bg-ice/40 text-xs font-semibold text-secondary">
                  <th className="px-6 py-3">开播时间</th>
                  <th className="px-6 py-3">直播标题</th>
                  <th className="px-6 py-3 text-right">时长</th>
                  <th className="px-6 py-3 text-right">弹幕数</th>
                  <th className="px-6 py-3 text-right">互动/人气</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-frost">
                {data.recentSessions.map((session, idx) => (
                  <tr key={idx} className="hover:bg-ice/25">
                    <td className="whitespace-nowrap px-6 py-3 text-xs text-secondary">
                      {session.startTime || "-"}
                    </td>
                    <td className="px-6 py-3 font-medium text-ink">
                      {session.title || "未命名直播"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-right tabular-nums text-secondary">
                      {session.durationHours != null
                        ? `${session.durationHours.toFixed(1)} h`
                        : "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-right tabular-nums text-ink">
                      {session.danmaku != null
                        ? session.danmaku.toLocaleString()
                        : "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-right tabular-nums text-secondary">
                      {session.interactions != null
                        ? session.interactions.toLocaleString()
                        : session.views != null
                        ? session.views.toLocaleString()
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
