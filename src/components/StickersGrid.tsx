"use client";

import { useEffect, useState } from "react";
import { Download, Maximize2, Smile, X } from "lucide-react";

interface StickerItem {
  id: string;
  title: string;
  imageUrl: string;
  filename: string;
}

export function StickersGrid() {
  const [items, setItems] = useState<StickerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StickerItem | null>(null);

  useEffect(() => {
    fetch("/api/stickers")
      .then((res) => res.json())
      .then((data: { items?: StickerItem[] }) => {
        setItems(data.items || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, idx) => (
          <div
            key={idx}
            className="aspect-square animate-pulse rounded-2xl bg-ice/40"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-frost bg-surface py-16 text-center">
        <Smile className="h-10 w-10 text-secondary/50" />
        <p className="mt-3 text-sm font-semibold text-ink">暂无表情包收录</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((item) => (
          <div
            key={item.id}
            className="group flex flex-col overflow-hidden rounded-2xl border border-frost bg-surface shadow-sm transition hover:-translate-y-0.5 hover:border-highlight"
          >
            <div
              onClick={() => setSelected(item)}
              className="relative aspect-square cursor-zoom-in overflow-hidden bg-ice/20 p-2"
            >
              <img
                src={item.imageUrl}
                alt={item.title}
                className="h-full w-full rounded-xl object-contain transition duration-300 group-hover:scale-105"
              />
              <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-surface/85 px-2 py-0.5 text-[11px] font-medium text-ink opacity-0 shadow backdrop-blur transition group-hover:opacity-100">
                <Maximize2 className="h-3 w-3" />
                <span>放大</span>
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-frost/60 px-3 py-2 text-xs">
              <span className="truncate font-medium text-ink">{item.title}</span>
              <a
                href={item.imageUrl}
                download={item.filename}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ice/60 px-2 py-1 text-[11px] font-medium text-primary transition hover:bg-ribbon"
                title="下载表情包"
              >
                <Download className="h-3 w-3" />
                <span>保存</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-xl overflow-hidden rounded-3xl border border-frost bg-surface p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute right-3 top-3 rounded-full bg-surface/90 p-1.5 text-ink shadow transition hover:bg-ice"
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={selected.imageUrl}
              alt={selected.title}
              className="max-h-[72vh] w-full rounded-2xl object-contain"
            />
            <div className="mt-3 flex items-center justify-between gap-3 px-1">
              <span className="text-sm font-semibold text-ink">
                {selected.title}
              </span>
              <a
                href={selected.imageUrl}
                download={selected.filename}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-white shadow-sm transition hover:opacity-90"
              >
                <Download className="h-3.5 w-3.5" />
                <span>保存 GIF</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
