import { Smile } from "lucide-react";
import { StickersGrid } from "@/components/StickersGrid";
import { SITE_CONFIG } from "@/lib/constants";

export default function StickersPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-frost bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ribbon text-primary">
            <Smile className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-ink">
              {SITE_CONFIG.streamerName} 表情包合集
            </h1>
            <p className="text-xs text-secondary">
              动态 GIF 表情包收录 · 点击可放大预览或直接保存使用
            </p>
          </div>
        </div>
      </div>

      <StickersGrid />
    </div>
  );
}
