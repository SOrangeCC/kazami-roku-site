import { Image as ImageIcon } from "lucide-react";
import { GalleryGrid } from "@/components/GalleryGrid";
import { SITE_CONFIG } from "@/lib/constants";

export default function GalleryPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-frost bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ribbon text-primary">
            <ImageIcon className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-ink">
              {SITE_CONFIG.streamerName} 美图画廊
            </h1>
            <p className="text-xs text-secondary">
              精选官方立绘、纪念插画与高分辨率同人美图 · 点击任意图片可放大浏览
            </p>
          </div>
        </div>
      </div>

      <GalleryGrid />
    </div>
  );
}
