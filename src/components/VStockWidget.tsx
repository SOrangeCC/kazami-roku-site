"use client";

import { useEffect, useRef, useState } from "react";
import {
  TrendingDown,
  TrendingUp,
  ExternalLink,
  ChevronDown,
  X,
  Activity,
} from "lucide-react";

interface VStockData {
  id: number;
  name: string;
  boardTag: string;
  category: string;
  price: number;
  changePct: number;
  changeAmount: number;
  nav: number;
  pb: number;
  pbStatus: string;
  limitLow: number;
  limitHigh: number;
  dps: number;
  dividendYield: number;
  trades24h: number;
  traders24h: number;
  longRatio: number;
  shortRatio: number;
  emaActivity: number;
  lives30d: number;
  danmaku30d: number;
  sparkline7d: number[];
  sourceUrl: string;
  syncedAt: string | null;
}

function Sparkline({
  values,
  isUp,
}: {
  values: number[];
  isUp: boolean;
}) {
  const pts = values.length >= 2 ? values : [values[0] ?? 1, values[0] ?? 1];
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const w = 88;
  const h = 28;
  const pad = 2;

  const points = pts
    .map((v, idx) => {
      const x = (idx / (pts.length - 1)) * (w - pad * 2) + pad;
      const y = h - pad - ((v - min) / span) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const strokeColor = isUp ? "#16a34a" : "#dc2626";

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="shrink-0 overflow-visible"
      aria-label="7日走势"
    >
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export function VStockWidget() {
  const [data, setData] = useState<VStockData | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("/api/vstock")
      .then((res) => res.json())
      .then((json: VStockData) => setData(json))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (!data) return null;

  const isUp = data.changePct >= 0;
  const changeSign = isUp ? "+" : "";

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* Compact Ticker Card */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        onFocus={() => setOpen(true)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 rounded-2xl border border-frost bg-surface px-5 py-3.5 text-left shadow-sm transition hover:border-highlight"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ice text-primary">
            <Activity className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-bold text-ink">
                V股 · {data.name}
              </span>
              <span className="rounded-md bg-ribbon px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {data.boardTag}
              </span>
              <span className="hidden rounded-md bg-ice/70 px-1.5 py-0.5 text-[10px] text-secondary sm:inline">
                {data.category}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-secondary">
              Danmakus 虚拟主播行情看板（只读）
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <div className="hidden sm:block">
            <Sparkline values={data.sparkline7d} isUp={isUp} />
          </div>

          <div className="text-right">
            <div className="text-base font-extrabold tabular-nums text-ink">
              {data.price.toFixed(2)}{" "}
              <span className="text-xs font-medium text-secondary">D币</span>
            </div>
            <div
              className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${
                isUp ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {isUp ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>
                {changeSign}
                {data.changePct.toFixed(2)}%
              </span>
            </div>
          </div>

          <ChevronDown
            className={`h-4 w-4 text-secondary transition-transform ${
              open ? "rotate-180 text-primary" : ""
            }`}
          />
        </div>
      </button>

      {/* Expandable Detail Popover (Desktop) / Inline Accordion (Mobile) */}
      {open && (
        <div className="mt-2 rounded-3xl border border-frost bg-surface p-5 shadow-lg md:absolute md:right-0 md:z-30 md:w-[460px] md:shadow-xl">
          <div className="flex items-center justify-between border-b border-frost pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-ink">
                  {data.name} ({data.boardTag})
                </span>
                <span className="rounded-full bg-ice px-2 py-0.5 text-[11px] text-primary">
                  {data.category}
                </span>
              </div>
              <div className="mt-0.5 text-[11px] text-secondary">
                {data.syncedAt
                  ? `快照时间：${new Date(data.syncedAt).toLocaleString("zh-CN")}`
                  : "当前展示为初始缓存快照"}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 text-secondary hover:bg-ice hover:text-ink md:hidden"
              aria-label="关闭详情"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
            <div className="rounded-xl bg-paper p-2.5">
              <div className="text-secondary">现价 / 涨跌额</div>
              <div className="mt-1 font-bold tabular-nums text-ink">
                {data.price.toFixed(2)} D币 ({changeSign}
                {data.changeAmount.toFixed(2)})
              </div>
            </div>

            <div className="rounded-xl bg-paper p-2.5">
              <div className="text-secondary">NAV / PB</div>
              <div className="mt-1 font-bold tabular-nums text-ink">
                {data.nav.toFixed(2)} · {data.pb.toFixed(2)}x {data.pbStatus}
              </div>
            </div>

            <div className="rounded-xl bg-paper p-2.5">
              <div className="text-secondary">日内涨跌停</div>
              <div className="mt-1 font-bold tabular-nums text-ink">
                {data.limitLow.toFixed(2)} ~ {data.limitHigh.toFixed(2)}
              </div>
            </div>

            <div className="rounded-xl bg-paper p-2.5">
              <div className="text-secondary">DPS / 股息率</div>
              <div className="mt-1 font-bold tabular-nums text-ink">
                {data.dps.toFixed(3)} · {data.dividendYield.toFixed(2)}%
              </div>
            </div>

            <div className="rounded-xl bg-paper p-2.5">
              <div className="text-secondary">24h 成交</div>
              <div className="mt-1 font-bold tabular-nums text-ink">
                {data.trades24h} 笔 / {data.traders24h} 人
              </div>
            </div>

            <div className="rounded-xl bg-paper p-2.5">
              <div className="text-secondary">30日场次 / 弹幕</div>
              <div className="mt-1 font-bold tabular-nums text-ink">
                {data.lives30d} 场 / {data.danmaku30d.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Long / Short Ratio & EMA Activity */}
          <div className="mt-3 rounded-xl bg-paper p-3 text-xs">
            <div className="flex items-center justify-between text-secondary">
              <span>多空情绪比（多 {data.longRatio}% / 空 {data.shortRatio}%）</span>
              <span>EMA 活跃度：{data.emaActivity.toLocaleString()}</span>
            </div>
            <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-ice">
              <div
                className="bg-emerald-500"
                style={{ width: `${Math.min(100, Math.max(0, data.longRatio))}%` }}
              />
              <div
                className="bg-rose-500"
                style={{ width: `${Math.min(100, Math.max(0, data.shortRatio))}%` }}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end">
            <a
              href={data.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <span>前往 Danmakus V股详情 →</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
