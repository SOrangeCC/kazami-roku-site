"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Image as ImageIcon, Film, Sparkles } from "lucide-react";

interface CreationItem {
  id: number;
  type: "art" | "clip" | string;
  title: string;
  authorName: string;
  authorUid: string | null;
  sourceUrl: string;
  thumbUrl: string;
  tags: string | null;
  publishedAt: string | null;
}

export function CreationGrid() {
  const [typeFilter, setTypeFilter] = useState<"" | "art" | "clip">("");
  const [items, setItems] = useState<CreationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ pageSize: "36" });
    if (typeFilter) params.set("type", typeFilter);

    fetch(`/api/creations?${params.toString()}`)
      .then((res) => res.json())
      .then((data: { total: number; items: CreationItem[] }) => {
        setItems(data.items || []);
        setTotal(data.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [typeFilter]);

  const parseTags = (raw: string | null): string[] => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-frost bg-surface p-1 shadow-sm">
          {[
            { value: "", label: "全部二创" },
            { value: "art", label: "同人插画" },
            { value: "clip", label: "切片 / 视频" },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setTypeFilter(tab.value as "" | "art" | "clip")}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                typeFilter === tab.value
                  ? "bg-ribbon text-primary"
                  : "text-secondary hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-secondary">
          共收录 <strong className="text-ink">{total}</strong> 件二创作品
        </span>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-64 animate-pulse rounded-2xl bg-ice/40"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-frost bg-surface py-16 text-center">
          <Sparkles className="h-10 w-10 text-secondary/50" />
          <p className="mt-3 text-sm font-semibold text-ink">
            暂无已审核展示的二创作品
          </p>
          <p className="mt-1 text-xs text-secondary">
            可运行 <code className="rounded bg-ice px-1.5 py-0.5">npm run sync:creations</code>{" "}
            抓取，或通过 <code className="rounded bg-ice px-1.5 py-0.5">/api/admin/creations</code> 录入
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const tags = parseTags(item.tags);
            return (
              <a
                key={item.id}
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col overflow-hidden rounded-2xl border border-frost bg-surface shadow-sm transition hover:-translate-y-0.5 hover:border-highlight"
              >
                <div className="relative aspect-video overflow-hidden bg-ice/30">
                  <img
                    src={item.thumbUrl}
                    alt={item.title}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-surface/90 px-2.5 py-0.5 text-[11px] font-semibold text-primary backdrop-blur">
                    {item.type === "clip" ? (
                      <>
                        <Film className="h-3 w-3" />
                        <span>切片/视频</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-3 w-3" />
                        <span>同人图</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <h3 className="line-clamp-2 text-sm font-bold text-ink group-hover:text-primary">
                      {item.title}
                    </h3>
                    {tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md bg-ice px-2 py-0.5 text-[10px] text-primary"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-frost pt-2.5 text-xs text-secondary">
                    <span className="truncate">@{item.authorName}</span>
                    <span className="inline-flex items-center gap-1 text-primary">
                      <span>原链</span>
                      <ExternalLink className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
