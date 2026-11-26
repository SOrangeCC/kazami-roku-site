import { Sparkles } from "lucide-react";
import { CreationGrid } from "@/components/CreationGrid";
import { SITE_CONFIG } from "@/lib/constants";

export default function CreationsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-frost bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ribbon text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-ink">
              {SITE_CONFIG.fanName} 二创聚合画廊
            </h1>
            <p className="text-xs text-secondary">
              收录来自 B 站动态与视频的同人插画、精彩切片与二创作品，点击卡片即可跳转支持原作者
            </p>
          </div>
        </div>
      </div>

      <CreationGrid />
    </div>
  );
}
