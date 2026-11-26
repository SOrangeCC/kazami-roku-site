"use client";

import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  X,
  ExternalLink,
  Music2,
} from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayerDock() {
  const { currentSong, currentClip, isPlaying, setIsPlaying, close } =
    usePlayerStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const isAudioSource =
    currentClip?.sourceType === "audio_url" ||
    currentClip?.sourceType === "r2_key";

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentClip || !isAudioSource || !currentClip.audioUrl) {
      return;
    }
    audio.src = currentClip.audioUrl;
    audio.playbackRate = playbackRate;
    audio.volume = muted ? 0 : volume;
    if (currentClip.startSec && currentClip.startSec > 0) {
      audio.currentTime = currentClip.startSec;
    }
    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentClip?.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = muted ? 0 : volume;
  }, [volume, muted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = playbackRate;
  }, [playbackRate]);

  if (!currentSong || !currentClip) {
    return null;
  }

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTime = Number(e.target.value);
    setCurrentTime(nextTime);
    if (audioRef.current) {
      audioRef.current.currentTime = nextTime;
    }
  };

  const bvidUrl = currentClip.bvid
    ? `https://www.bilibili.com/video/${currentClip.bvid}?p=${
        currentClip.page || 1
      }&t=${currentClip.startSec || 0}`
    : null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-frost bg-surface/95 px-4 py-2.5 shadow-lg backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        {/* Track Info */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ribbon text-primary">
            <Music2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-ink">
              {currentSong.title}
              {currentSong.artist ? (
                <span className="ml-1.5 font-normal text-secondary">
                  - {currentSong.artist}
                </span>
              ) : null}
            </div>
            <div className="truncate text-xs text-secondary">
              {currentClip.title || "歌切版本"}
              {currentClip.sungAt ? ` · ${currentClip.sungAt}` : ""}
            </div>
          </div>
        </div>

        {/* Controls */}
        {isAudioSource && currentClip.audioUrl ? (
          <div className="flex flex-1 items-center gap-3 sm:max-w-lg">
            <button
              type="button"
              onClick={togglePlay}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white transition hover:opacity-90"
              aria-label={isPlaying ? "暂停" : "播放"}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 translate-x-0.5" />
              )}
            </button>

            <span className="w-10 text-right text-xs tabular-nums text-secondary">
              {formatTime(currentTime)}
            </span>

            <input
              type="range"
              min={0}
              max={duration || currentClip.durationSec || 100}
              value={currentTime}
              onChange={handleSeek}
              className="h-1.5 flex-1 cursor-pointer accent-highlight"
              aria-label="播放进度"
            />

            <span className="w-10 text-xs tabular-nums text-secondary">
              {formatTime(duration || currentClip.durationSec || 0)}
            </span>

            <div className="hidden items-center gap-1.5 md:flex">
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                className="text-secondary hover:text-primary"
                aria-label={muted ? "取消静音" : "静音"}
              >
                {muted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  setMuted(false);
                  setVolume(Number(e.target.value));
                }}
                className="h-1 w-16 cursor-pointer accent-highlight"
                aria-label="音量"
              />
              <button
                type="button"
                onClick={() =>
                  setPlaybackRate((r) => (r === 1 ? 1.25 : r === 1.25 ? 1.5 : 1))
                }
                className="rounded border border-frost px-1.5 py-0.5 text-[11px] font-medium text-secondary hover:text-primary"
              >
                {playbackRate}x
              </button>
            </div>

            <audio
              ref={audioRef}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onEnded={() => setIsPlaying(false)}
              onPause={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
            />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {bvidUrl ? (
              <a
                href={bvidUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
              >
                <span>在 B 站播放歌切 ({currentClip.bvid})</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <span className="text-xs text-secondary">暂无可用音频地址</span>
            )}
          </div>
        )}

        {/* Close */}
        <button
          type="button"
          onClick={close}
          className="rounded-full p-1.5 text-secondary transition hover:bg-ice hover:text-ink"
          aria-label="关闭播放器"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
