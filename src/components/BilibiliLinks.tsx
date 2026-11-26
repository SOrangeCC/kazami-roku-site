import { ExternalLink, Tv, User, ListMusic, BarChart2 } from "lucide-react";
import { SITE_CONFIG } from "@/lib/constants";

const LINKS = [
  {
    title: "B 站个人空间",
    desc: `UID: ${SITE_CONFIG.uid}`,
    href: SITE_CONFIG.spaceUrl,
    icon: User,
  },
  {
    title: "B 站直播间",
    desc: `房间号: ${SITE_CONFIG.roomId}`,
    href: SITE_CONFIG.liveUrl,
    icon: Tv,
  },
  {
    title: "StarBot 原歌单",
    desc: "上游实时点歌库",
    href: SITE_CONFIG.starbotUrl,
    icon: ListMusic,
  },
  {
    title: "Danmakus 数据页",
    desc: "弹幕与开播历史统计",
    href: SITE_CONFIG.danmakusUrl,
    icon: BarChart2,
  },
];

export function BilibiliLinks() {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {LINKS.map(({ title, desc, href, icon: Icon }) => (
        <a
          key={title}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-between rounded-2xl border border-frost bg-surface p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-highlight"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ice text-primary transition group-hover:bg-ribbon">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-ink group-hover:text-primary">
                {title}
              </div>
              <div className="text-xs text-secondary">{desc}</div>
            </div>
          </div>
          <ExternalLink className="h-4 w-4 shrink-0 text-secondary transition group-hover:text-primary" />
        </a>
      ))}
    </section>
  );
}
