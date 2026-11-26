"use client";

import { create } from "zustand";

export interface PlayerSong {
  id: number;
  title: string;
  artist: string;
}

export interface PlayerClip {
  id: number;
  songId: number;
  sourceType: "audio_url" | "r2_key" | "bilibili_bv" | string;
  title: string | null;
  audioUrl: string | null;
  bvid: string | null;
  page: number | null;
  startSec: number | null;
  endSec: number | null;
  durationSec: number | null;
  sungAt: string | null;
}

interface PlayerState {
  currentSong: PlayerSong | null;
  currentClip: PlayerClip | null;
  isPlaying: boolean;
  play: (song: PlayerSong, clip: PlayerClip) => void;
  setIsPlaying: (playing: boolean) => void;
  close: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentSong: null,
  currentClip: null,
  isPlaying: false,
  play: (song, clip) =>
    set({
      currentSong: song,
      currentClip: clip,
      isPlaying: true,
    }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  close: () =>
    set({
      currentSong: null,
      currentClip: null,
      isPlaying: false,
    }),
}));
