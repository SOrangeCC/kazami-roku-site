import {
  sqliteTable,
  integer,
  text,
  real,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// 1. B 站实时开播状态缓存（单行表，id 固定为 1）
export const liveStatusCache = sqliteTable("live_status_cache", {
  id: integer("id").primaryKey().default(1),
  roomId: text("room_id").notNull(),
  liveStatus: integer("live_status").notNull().default(0), // 0=未开播, 1=直播中, 2=轮播中
  title: text("title"),
  coverUrl: text("cover_url"),
  areaName: text("area_name"),
  liveStartAt: text("live_start_at"),
  onlineCount: integer("online_count"),
  updatedAt: text("updated_at").notNull(),
});

// 2. 动态周表归档
export const weeklySchedules = sqliteTable("weekly_schedules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  opusId: text("opus_id").unique(),
  weekLabel: text("week_label"),
  caption: text("caption"),
  imageUrl: text("image_url").notNull(),
  sourceUrl: text("source_url"),
  publishedAt: text("published_at").notNull(),
  isManualOverride: integer("is_manual_override", { mode: "boolean" })
    .notNull()
    .default(false),
  parsedJson: text("parsed_json"),
  createdAt: text("created_at").notNull(),
});

// 3. 基础歌单表（兼容 StarBot 190 首字段）
export const songs = sqliteTable(
  "songs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    artist: text("artist").notNull().default(""),
    language: text("language"),
    genre: text("genre"),
    requestTier: text("request_tier").default("免费"),
    remark: text("remark"),
    initial: text("initial"),
    hasClip: integer("has_clip", { mode: "boolean" }).notNull().default(false),
    sourceHash: text("source_hash"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [uniqueIndex("songs_title_artist_idx").on(table.title, table.artist)]
);

// 4. 【预留】歌切关联与播放源表（支持一首歌关联多条歌切）
export const songClips = sqliteTable("song_clips", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  songId: integer("song_id")
    .notNull()
    .references(() => songs.id, { onDelete: "cascade" }),
  sourceType: text("source_type").notNull(), // "audio_url" | "r2_key" | "bilibili_bv"
  title: text("title"),
  audioUrl: text("audio_url"),
  bvid: text("bvid"),
  page: integer("page").default(1),
  startSec: integer("start_sec").default(0),
  endSec: integer("end_sec"),
  durationSec: integer("duration_sec"),
  sungAt: text("sung_at"),
  isPrimary: integer("is_primary", { mode: "boolean" })
    .notNull()
    .default(false),
  status: text("status").notNull().default("published"), // "draft" | "published"
  createdAt: text("created_at").notNull(),
});

// 5. 二创聚合表
export const fanCreations = sqliteTable("fan_creations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(), // "art" | "clip"
  title: text("title").notNull(),
  authorName: text("author_name").notNull(),
  authorUid: text("author_uid"),
  sourceUrl: text("source_url").notNull().unique(),
  thumbUrl: text("thumb_url").notNull(),
  tags: text("tags"), // JSON 数组字符串
  publishedAt: text("published_at"),
  status: text("status").notNull().default("approved"), // "pending" | "approved" | "hidden"
  createdAt: text("created_at").notNull(),
});

// 6. 直播数据汇总快照（对接 Danmakus）
export const streamStatsSnapshots = sqliteTable("stream_stats_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  rangeKey: text("range_key").notNull().unique(), // "all" | "30d" | "7d"
  followers: integer("followers"),
  following: integer("following"),
  totalSessions: integer("total_sessions"),
  totalDanmaku: integer("total_danmaku"),
  totalHours: real("total_hours"),
  danmakuPerHour: real("danmaku_per_hour"),
  recentSessionsJson: text("recent_sessions_json"),
  sourceUrl: text("source_url").notNull(),
  syncedAt: text("synced_at").notNull(),
});

// 7. V股 (VStock) 行情快照（单行表，id 固定为 1）
export const vstockSnapshots = sqliteTable("vstock_snapshots", {
  id: integer("id").primaryKey().default(1),
  name: text("name").notNull().default("風見ロク"),
  boardTag: text("board_tag").notNull().default("V版"),
  category: text("category").notNull().default("唱见电台"),
  price: real("price").notNull(),
  changePct: real("change_pct").notNull(),
  changeAmount: real("change_amount").notNull(),
  nav: real("nav").notNull(),
  pb: real("pb").notNull(),
  pbStatus: text("pb_status").notNull(),
  limitLow: real("limit_low").notNull(),
  limitHigh: real("limit_high").notNull(),
  dps: real("dps").notNull(),
  dividendYield: real("dividend_yield").notNull(),
  trades24h: integer("trades_24h").notNull().default(0),
  traders24h: integer("traders_24h").notNull().default(0),
  longRatio: real("long_ratio").notNull().default(50),
  shortRatio: real("short_ratio").notNull().default(50),
  emaActivity: integer("ema_activity").notNull().default(0),
  lives30d: integer("lives_30d").notNull().default(0),
  danmaku30d: integer("danmaku_30d").notNull().default(0),
  sparkline7dJson: text("sparkline_7d_json").notNull(),
  sourceUrl: text("source_url").notNull(),
  syncedAt: text("synced_at").notNull(),
});

export type LiveStatusCache = typeof liveStatusCache.$inferSelect;
export type WeeklySchedule = typeof weeklySchedules.$inferSelect;
export type Song = typeof songs.$inferSelect;
export type SongClip = typeof songClips.$inferSelect;
export type FanCreation = typeof fanCreations.$inferSelect;
export type StreamStatsSnapshot = typeof streamStatsSnapshots.$inferSelect;
export type VStockSnapshot = typeof vstockSnapshots.$inferSelect;
