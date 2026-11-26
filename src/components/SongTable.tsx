"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Shuffle,
  Copy,
  Play,
  Music,
  Check,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { usePlayerStore, PlayerClip } from "@/store/playerStore";

interface SongItem {
  id: number;
  title: string;
  artist: string;
  language: string | null;
  genre: string | null;
  requestTier: string | null;
  remark: string | null;
  initial: string | null;
  hasClip: boolean;
  primaryClip: PlayerClip | null;
}

interface SongsApiResponse {
  total: number;
  filters: {
    languages: string[];
    genres: string[];
    tiers: string[];
    initials: string[];
  };
  items: SongItem[];
}

const DEFAULT_LANGUAGES = ["国语", "日语", "韩语", "英语", "纯音乐"];
const DEFAULT_TIERS = ["免费", "付费", "舰长专属", "提督专属", "总督专属"];
const INITIALS = [
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  "#",
];

export function SongTable() {
  const { play, currentSong } = usePlayerStore();

  const [songs, setSongs] = useState<SongItem[]>([]);
  const [facets, setFacets] = useState<SongsApiResponse["filters"]>({
    languages: [],
    genres: [],
    tiers: [],
    initials: [],
  });
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [language, setLanguage] = useState("");
  const [genre, setGenre] = useState("");
  const [tier, setTier] = useState("");
  const [initial, setInitial] = useState("");
  const [hasClipOnly, setHasClipOnly] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 2400);
  }, []);

  const fetchSongs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (language) params.set("language", language);
      if (genre) params.set("genre", genre);
      if (tier) params.set("tier", tier);
      if (initial) params.set("initial", initial);
      if (hasClipOnly) params.set("hasClip", "1");

      const res = await fetch(`/api/songs?${params.toString()}`);
      if (!res.ok) return;
      const data = (await res.json()) as SongsApiResponse;
      setSongs(data.items || []);
      if (data.filters) setFacets(data.filters);
    } finally {
      setLoading(false);
    }
  }, [q, language, genre, tier, initial, hasClipOnly]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSongs();
    }, 150);
    return () => clearTimeout(timer);
  }, [fetchSongs]);

  const copySongCommand = async (title: string) => {
    const command = `点歌 ${title}`;
    try {
      await navigator.clipboard.writeText(command);
      showToast(`已复制：${command}`);
    } catch {
      showToast(`请手动复制：${command}`);
    }
  };

  const handleRandomPick = async () => {
    if (songs.length === 0) return;
    const picked = songs[Math.floor(Math.random() * songs.length)];
    await copySongCommand(picked.title);
    if (picked.hasClip && picked.primaryClip) {
      play(
        { id: picked.id, title: picked.title, artist: picked.artist },
        picked.primaryClip
      );
    }
  };

  const resetFilters = () => {
    setQ("");
    setLanguage("");
    setGenre("");
    setTier("");
    setInitial("");
    setHasClipOnly(false);
  };

  const languageOptions = useMemo(
    () =>
      facets.languages.length > 0 ? facets.languages : DEFAULT_LANGUAGES,
    [facets.languages]
  );

  const tierOptions = useMemo(
    () => (facets.tiers.length > 0 ? facets.tiers : DEFAULT_TIERS),
    [facets.tiers]
  );

  return (
    <div className="space-y-4">
      {/* Search & Filter Controls */}
      <div className="rounded-3xl border border-frost bg-surface p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索歌名、歌手或备注..."
              className="w-full rounded-full border border-frost bg-paper py-2 pl-10 pr-4 text-sm text-ink placeholder:text-secondary focus:border-highlight focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleRandomPick}
            disabled={songs.length === 0}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            <Shuffle className="h-4 w-4" />
            <span>随便听听</span>
          </button>

          <button
            type="button"
            onClick={() => setHasClipOnly((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
              hasClipOnly
                ? "border-highlight bg-ribbon text-primary"
                : "border-frost bg-paper text-secondary hover:text-ink"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>仅看有歌切</span>
          </button>

          {(q || language || genre || tier || initial || hasClipOnly) && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 rounded-full border border-frost px-3 py-2 text-xs text-secondary hover:text-primary"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>重置</span>
            </button>
          )}
        </div>

        {/* Selectors */}
        <div className="grid gap-2.5 sm:grid-cols-3">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label="语种筛选"
            className="rounded-xl border border-frost bg-paper px-3 py-2 text-xs text-ink focus:border-highlight focus:outline-none"
          >
            <option value="">全部语种</option>
            {languageOptions.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>

          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            aria-label="曲风筛选"
            className="rounded-xl border border-frost bg-paper px-3 py-2 text-xs text-ink focus:border-highlight focus:outline-none"
          >
            <option value="">全部曲风</option>
            {facets.genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            aria-label="点歌权限筛选"
            className="rounded-xl border border-frost bg-paper px-3 py-2 text-xs text-ink focus:border-highlight focus:outline-none"
          >
            <option value="">全部点歌权限</option>
            {tierOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Initials Bar */}
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setInitial("")}
            className={`rounded-lg px-2 py-1 text-xs font-medium transition ${
              initial === ""
                ? "bg-ribbon text-primary"
                : "text-secondary hover:bg-ice/60"
            }`}
          >
            全部
          </button>
          {INITIALS.map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => setInitial((prev) => (prev === ch ? "" : ch))}
              className={`rounded-lg px-2 py-1 text-xs font-medium transition ${
                initial === ch
                  ? "bg-ribbon text-primary"
                  : "text-secondary hover:bg-ice/60"
              }`}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between px-1 text-xs text-secondary">
        <span>
          共找到 <strong className="text-ink">{songs.length}</strong> 首歌曲
        </span>
        <span>点击任意行即可复制「点歌 歌名」到剪贴板</span>
      </div>

      {/* Songs Table */}
      <div className="overflow-hidden rounded-3xl border border-frost bg-surface shadow-sm">
        {loading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-12 animate-pulse rounded-xl bg-ice/40"
              />
            ))}
          </div>
        ) : songs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Music className="h-10 w-10 text-secondary/50" />
            <p className="mt-3 text-sm font-semibold text-ink">
              没有匹配到符合条件的歌曲
            </p>
            <p className="mt-1 text-xs text-secondary">
              可以尝试清空搜索关键词或重置筛选条件
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Stacked Cards */}
            <div className="divide-y divide-frost md:hidden">
              {songs.map((song) => {
                const isPlayingThis = currentSong?.id === song.id;
                const canPlayClip = Boolean(song.hasClip && song.primaryClip);
                return (
                  <div
                    key={song.id}
                    onClick={() => copySongCommand(song.title)}
                    className={`cursor-pointer p-4 transition active:bg-ice/40 ${
                      isPlayingThis ? "bg-ribbon/30" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-ink">
                            {song.title}
                          </span>
                          {canPlayClip && (
                            <span className="rounded-full bg-ribbon px-2 py-0.5 text-[10px] font-semibold text-primary">
                              有歌切
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-xs text-secondary">
                          {song.artist || "-"}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {song.language && (
                            <span className="rounded-md bg-ice px-2 py-0.5 text-[11px] text-primary">
                              {song.language}
                            </span>
                          )}
                          {song.genre && (
                            <span className="rounded-md bg-hair px-2 py-0.5 text-[11px] text-secondary">
                              {song.genre}
                            </span>
                          )}
                          {song.requestTier && song.requestTier !== "免费" && (
                            <span className="rounded-md bg-ribbon/60 px-2 py-0.5 text-[11px] text-primary">
                              {song.requestTier}
                            </span>
                          )}
                        </div>
                        {song.remark && (
                          <p className="mt-1.5 text-xs text-secondary">
                            {song.remark}
                          </p>
                        )}
                      </div>

                      <div
                        className="flex shrink-0 flex-col gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => copySongCommand(song.title)}
                          title={`复制点歌 ${song.title}`}
                          className="inline-flex items-center justify-center gap-1 rounded-full border border-frost bg-paper px-3 py-1.5 text-xs font-medium text-ink transition hover:border-highlight hover:text-primary"
                        >
                          <Copy className="h-3 w-3" />
                          <span>点歌</span>
                        </button>
                        <button
                          type="button"
                          disabled={!canPlayClip}
                          onClick={() => {
                            if (song.primaryClip) {
                              play(
                                {
                                  id: song.id,
                                  title: song.title,
                                  artist: song.artist,
                                },
                                song.primaryClip
                              );
                            }
                          }}
                          title={canPlayClip ? "播放歌切" : "歌切待补充"}
                          className={`inline-flex items-center justify-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                            canPlayClip
                              ? "bg-primary text-white hover:opacity-90"
                              : "cursor-not-allowed border border-frost bg-hair text-secondary/50"
                          }`}
                        >
                          <Play className="h-3 w-3" />
                          <span>{canPlayClip ? "试听" : "待补充"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-frost bg-ice/40 text-xs font-semibold text-secondary">
                    <th className="px-4 py-3">歌名</th>
                    <th className="px-4 py-3">歌手</th>
                    <th className="px-4 py-3">语种 / 曲风</th>
                    <th className="px-4 py-3">权限</th>
                    <th className="hidden px-4 py-3 lg:table-cell">备注</th>
                    <th className="px-4 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-frost">
                  {songs.map((song) => {
                    const isPlayingThis = currentSong?.id === song.id;
                    const canPlayClip = Boolean(song.hasClip && song.primaryClip);
                    return (
                      <tr
                        key={song.id}
                        onClick={() => copySongCommand(song.title)}
                        className={`cursor-pointer transition hover:bg-ice/35 ${
                          isPlayingThis ? "bg-ribbon/30" : ""
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-ink">
                          <div className="flex items-center gap-2">
                            <span>{song.title}</span>
                            {canPlayClip && (
                              <span className="rounded-full bg-ribbon px-2 py-0.5 text-[10px] font-semibold text-primary">
                                有歌切
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-secondary">
                          {song.artist || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {song.language && (
                              <span className="rounded-md bg-ice px-2 py-0.5 text-[11px] text-primary">
                                {song.language}
                              </span>
                            )}
                            {song.genre && (
                              <span className="rounded-md bg-hair px-2 py-0.5 text-[11px] text-secondary">
                                {song.genre}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-secondary">
                          {song.requestTier || "免费"}
                        </td>
                        <td className="hidden max-w-xs truncate px-4 py-3 text-xs text-secondary lg:table-cell">
                          {song.remark || "-"}
                        </td>
                        <td
                          className="px-4 py-3 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => copySongCommand(song.title)}
                              title={`复制点歌 ${song.title}`}
                              className="inline-flex items-center gap-1 rounded-full border border-frost bg-paper px-2.5 py-1 text-xs font-medium text-ink transition hover:border-highlight hover:text-primary"
                            >
                              <Copy className="h-3 w-3" />
                              <span>点歌</span>
                            </button>

                            <button
                              type="button"
                              disabled={!canPlayClip}
                              onClick={() => {
                                if (song.primaryClip) {
                                  play(
                                    {
                                      id: song.id,
                                      title: song.title,
                                      artist: song.artist,
                                    },
                                    song.primaryClip
                                  );
                                }
                              }}
                              title={canPlayClip ? "播放歌切" : "歌切待补充"}
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                                canPlayClip
                                  ? "bg-primary text-white hover:opacity-90"
                                  : "cursor-not-allowed border border-frost bg-hair text-secondary/50"
                              }`}
                            >
                              <Play className="h-3 w-3" />
                              <span>{canPlayClip ? "试听" : "待补充"}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper shadow-lg">
          <Check className="h-3.5 w-3.5 text-highlight" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
