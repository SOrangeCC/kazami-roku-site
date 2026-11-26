"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Image as ImageIcon } from "lucide-react";

interface GalleryItem {
  id: string;
  title: string;
  imageUrl: string;
  authorName: string;
}

export function GalleryPreview() {
  const [items, setItems] = useState<GalleryItem[]>([]);

  useEffect(() => {
    fetch("/api/gallery")
      .then((res) => res.json())
      .then((data: { items?: GalleryItem[] }) => {
        setItems((data.items || []).slice(0, 4));
      })
      .catch(() => {});
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="rounded-3xl border border-frost bg-surface p-6 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ice text-primary">
            <ImageIcon className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-ink">精选美图</h2>
            <p className="text-xs text-secondary">立绘与同人插画精选</p>
          </div>
        </div>

        <Link
          href="/gallery"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <span>进入美图画廊</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.id}
            href="/gallery"
            className="group overflow-hidden rounded-2xl border border-frost bg-paper"
          >
            <div className="aspect-[4/3] overflow-hidden">
              <img
                src={item.imageUrl}
                alt={item.title}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
