import { Music } from "lucide-react";
import { SongTable } from "@/components/SongTable";
import { SITE_CONFIG } from "@/lib/constants";

export default function SongsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-frost bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ribbon text-primary">
              <Music className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-ink">
                {SITE_CONFIG.streamerName} 的直播歌单
              </h1>
              <p className="text-xs text-secondary">
                同步自 StarBot 点歌库 · 支持多维筛选、随机抽歌与一键复制弹幕点歌指令
              </p>
            </div>
          </div>

          <a
            href={SITE_CONFIG.starbotUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-frost px-3.5 py-1.5 text-xs font-medium text-primary hover:border-highlight"
          >
            打开 StarBot 原页
          </a>
        </div>
      </div>

      <SongTable />
    </div>
  );
}
