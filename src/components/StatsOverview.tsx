"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, ArrowRight, Users, MessageSquare, Clock, Tv } from "lucide-react";

interface StatsSummary {
  followers: number | null;
  totalSessions: number | null;
  totalDanmaku: number | null;
  totalHours: number | null;
  syncedAt: string | null;
}

export function StatsOverview() {
  const [stats, setStats] = useState<StatsSummary | null>(null);

  useEffect(() => {
    fetch("/api/stats/summary?range=all")
      .then((res) => res.json())
      .then((data: StatsSummary) => setStats(data))
      .catch(() => {});
  }, []);

  const cards = [
    {
      label: "B 站粉丝数",
      value:
        stats?.followers != null ? stats.followers.toLocaleString() : "--",
      icon: Users,
    },
    {
      label: "累计直播场次",
      value:
        stats?.totalSessions != null
          ? `${stats.totalSessions.toLocaleString()} 场`
          : "--",
      icon: Tv,
    },
    {
      label: "累计弹幕数",
      value:
        stats?.totalDanmaku != null
          ? stats.totalDanmaku.toLocaleString()
          : "--",
      icon: MessageSquare,
    },
    {
      label: "累计开播时长",
      value:
        stats?.totalHours != null ? `${stats.totalHours.toFixed(1)} h` : "--",
      icon: Clock,
    },
  ];

  return (
    <section className="rounded-3xl border border-frost bg-surface p-6 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ice text-primary">
            <BarChart3 className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-ink">直播数据概览</h2>
            <p className="text-xs text-secondary">
              数据源：Danmakus 频道统计快照
            </p>
          </div>
        </div>

        <Link
          href="/stats"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <span>查看完整数据</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl border border-frost bg-paper p-4"
          >
            <div className="flex items-center gap-1.5 text-xs text-secondary">
              <Icon className="h-3.5 w-3.5 text-primary" />
              <span>{label}</span>
            </div>
            <div className="mt-1.5 text-xl font-bold tabular-nums text-ink">
              {value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
