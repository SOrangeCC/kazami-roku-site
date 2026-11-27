"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Image as ImageIcon, Maximize2, X } from "lucide-react";

interface GalleryItem {
  id: string;
  title: string;
  imageUrl: string;
  authorName: string;
  sourceUrl: string | null;
  isLocal: boolean;
}

export function GalleryGrid() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<GalleryItem | null>(null);

  useEffect(() => {
    fetch("/api/gallery")
      .then((res) => res.json())
      .then((data: { items?: GalleryItem[] }) => {
        setItems(data.items || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="aspect-[4/3] animate-pulse rounded-2xl bg-ice/40"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-frost bg-surface py-16 text-center">
        <ImageIcon className="h-10 w-10 text-secondary/50" />
        <p className="mt-3 text-sm font-semibold text-ink">暂无美图收录</p>
        <p className="mt-1 text-xs text-secondary">
          将图片放入{" "}
          <code className="rounded bg-ice px-1.5 py-0.5">
            public/images/gallery/
          </code>{" "}
          或审核通过同人插画后即可自动展示
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="group flex flex-col overflow-hidden rounded-2xl border border-frost bg-surface shadow-sm transition hover:-translate-y-0.5 hover:border-highlight"
          >
            <div
              onClick={() => setSelected(item)}
              className="relative aspect-[4/3] cursor-zoom-in overflow-hidden bg-ice/25"
            >
              <img
                src={item.imageUrl}
                alt={item.title}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
              <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-surface/85 px-2.5 py-1 text-[11px] font-medium text-ink opacity-0 shadow backdrop-blur transition group-hover:opacity-100">
                <Maximize2 className="h-3 w-3" />
                <span>大图</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="absolute right-4 top-4 rounded-full bg-surface p-2 text-ink shadow-lg"
            aria-label="关闭大图"
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className="flex max-h-[90vh] max-w-5xl flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selected.imageUrl}
              alt={selected.title}
              className="max-h-[82vh] max-w-full rounded-xl object-contain"
            />
            <div className="flex items-center gap-3 rounded-full bg-surface/90 px-4 py-1.5 text-xs text-ink">
              <span className="font-semibold">{selected.title}</span>
              <span className="text-secondary">@{selected.authorName}</span>
              {selected.sourceUrl && (
                <a
                  href={selected.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <span>查看原帖</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
