"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Music,
  Sparkles,
  BarChart3,
  Home,
  Image as ImageIcon,
} from "lucide-react";
import { SITE_CONFIG } from "@/lib/constants";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS = [
  { href: "/", label: "首页", shortLabel: "首页", icon: Home },
  { href: "/songs", label: "歌单", shortLabel: "歌单", icon: Music },
  { href: "/gallery", label: "美图", shortLabel: "美图", icon: ImageIcon },
  { href: "/creations", label: "二创", shortLabel: "二创", icon: Sparkles },
  { href: "/stats", label: "直播数据", shortLabel: "数据", icon: BarChart3 },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-frost bg-surface/90 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 py-2.5 md:py-3">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="group flex min-w-0 shrink-0 items-center gap-2.5">
            <img
              src="/images/avatar.jpg"
              alt={SITE_CONFIG.streamerName}
              className="h-9 w-9 shrink-0 rounded-xl border border-frost object-cover shadow-sm transition group-hover:scale-105"
            />
            <div className="min-w-0 leading-tight">
              <div className="whitespace-nowrap text-sm font-bold tracking-wide text-ink">
                {SITE_CONFIG.streamerName}
              </div>
              <div className="hidden whitespace-nowrap text-[11px] text-secondary sm:block">
                {SITE_CONFIG.group}
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1.5 md:flex">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-ribbon text-primary shadow-sm"
                      : "text-secondary hover:bg-ice/60 hover:text-ink"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
            <div className="ml-2 shrink-0">
              <ThemeToggle />
            </div>
          </nav>

          {/* Mobile theme toggle */}
          <div className="shrink-0 md:hidden">
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile Row 2: single-row horizontal nav */}
        <nav className="mt-2 flex items-center justify-between gap-1 overflow-x-auto border-t border-frost/60 pt-2 md:hidden">
          {NAV_ITEMS.map(({ href, label, shortLabel, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  active
                    ? "bg-ribbon text-primary shadow-sm"
                    : "text-secondary hover:bg-ice/60 hover:text-ink"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="sm:hidden">{shortLabel}</span>
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
