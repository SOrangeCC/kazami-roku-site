"use client";

import { useState } from "react";
import { Sparkles, Snowflake, Heart, Music, MessageCircle } from "lucide-react";
import { SITE_CONFIG } from "@/lib/constants";

interface EasterEgg {
  id: string;
  label: string;
  badge: string;
  detail: string;
  positionClass: string;
}

const EASTER_EGGS: EasterEgg[] = [
  {
    id: "hairpins",
    label: "几何双发夹",
    badge: "发型细节",
    detail: "刘海一侧的双层几何发夹（深炭与银白三角夹）。",
    positionClass: "left-[63%] top-[31%]",
  },
  {
    id: "eyes",
    label: "冰蓝双眸",
    badge: "瞳色细节",
    detail: "澄澈的冰蓝渐变瞳孔与眼底星光。",
    positionClass: "left-[39%] top-[46%]",
  },
  {
    id: "braids",
    label: "双辫与蓝丝带",
    badge: "长春花蓝",
    detail: "两侧编织麻花辫搭配晴蓝蝴蝶结丝带。",
    positionClass: "left-[29%] top-[64%]",
  },
  {
    id: "sailor",
    label: "冬日水手服",
    badge: "冬装设定",
    detail: "蓝白水手领结配米白针织开衫，呼应「于再次相遇的冬季」主题。",
    positionClass: "left-[50%] top-[82%]",
  },
];

export function CharacterHero() {
  const [activeId, setActiveId] = useState<string>(EASTER_EGGS[0].id);
  const [imgError, setImgError] = useState(false);

  const activeEgg =
    EASTER_EGGS.find((item) => item.id === activeId) ?? EASTER_EGGS[0];

  return (
    <section className="relative overflow-hidden rounded-3xl border border-frost bg-gradient-to-br from-surface via-paper to-ice/60 p-6 shadow-sm sm:p-8">
      <div className="grid items-center gap-8 lg:grid-cols-12">
        {/* Left: Portrait */}
        <div className="relative mx-auto w-full max-w-md lg:col-span-5">
          <div className="relative w-full overflow-hidden rounded-2xl border border-frost bg-ice/20 shadow-md">
            {!imgError ? (
              <img
                src="/images/portrait-winter.jpg"
                alt={`${SITE_CONFIG.streamerName} 冬季水手服立绘`}
                className="block h-auto w-full"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex aspect-[4/3] w-full flex-col items-center justify-center bg-gradient-to-b from-ice/60 via-ribbon/30 to-paper p-6 text-center">
                <Snowflake className="h-14 w-14 text-primary/70" />
                <p className="mt-4 text-lg font-bold text-ink">
                  {SITE_CONFIG.streamerName}
                </p>
                <p className="mt-1 text-xs text-secondary">
                  {SITE_CONFIG.group} · 冬季水手服立绘
                </p>
                <p className="mt-3 rounded-full bg-surface/80 px-3 py-1 text-[11px] text-secondary">
                  请将立绘放置于 public/images/portrait-winter.jpg
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Intro & Easter Egg Details */}
        <div className="flex flex-col gap-5 lg:col-span-7">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-ribbon/80 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>
                {SITE_CONFIG.group} · 粉丝名 {SITE_CONFIG.fanName}
              </span>
            </div>

            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              {SITE_CONFIG.streamerName}
            </h1>

            <p className="mt-3 rounded-2xl border border-frost bg-surface/80 px-4 py-3 text-sm italic text-secondary">
              “{SITE_CONFIG.signature}”
            </p>
          </div>

          {/* 4 Easter egg selector pills */}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-secondary">
              人设与立绘设计彩蛋
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {EASTER_EGGS.map((egg, idx) => {
                const active = egg.id === activeId;
                return (
                  <button
                    key={egg.id}
                    type="button"
                    onClick={() => setActiveId(egg.id)}
                    className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                      active
                        ? "border-highlight bg-ribbon/70 font-semibold text-primary shadow-sm"
                        : "border-frost bg-surface/80 text-secondary hover:border-highlight/60 hover:text-ink"
                    }`}
                  >
                    <div className="text-[10px] opacity-75">
                      0{idx + 1} · {egg.badge}
                    </div>
                    <div className="mt-0.5 truncate">{egg.label}</div>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 rounded-2xl border border-frost bg-surface p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-primary">
                <Heart className="h-4 w-4" />
                <span>{activeEgg.label}</span>
                <span className="rounded-full bg-ice px-2 py-0.5 text-[11px] font-medium">
                  {activeEgg.badge}
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-ink">
                {activeEgg.detail}
              </p>
            </div>
          </div>

          {/* Quick CTA */}
          <div className="flex flex-wrap gap-3 pt-1">
            <a
              href="/songs"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              <Music className="h-4 w-4" />
              <span>浏览歌单 & 点歌</span>
            </a>
            <a
              href={SITE_CONFIG.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-frost bg-surface px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-highlight hover:text-primary"
            >
              <MessageCircle className="h-4 w-4 text-primary" />
              <span>进入 B 站直播间</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
