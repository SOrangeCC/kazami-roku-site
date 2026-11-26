import Database from "better-sqlite3";
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

function resolveDbPath(): string {
  const raw = process.env.DATABASE_URL || "file:./data/app.db";
  const cleaned = raw.startsWith("file:") ? raw.slice(5) : raw;
  return path.isAbsolute(cleaned)
    ? cleaned
    : path.resolve(process.cwd(), cleaned);
}

const globalForDb = globalThis as unknown as {
  __sqlite?: Database.Database;
  __db?: BetterSQLite3Database<typeof schema>;
  __tablesEnsured?: boolean;
};

function createSqliteConnection(): Database.Database {
  const dbPath = resolveDbPath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const instance = new Database(dbPath);
  instance.pragma("journal_mode = WAL");
  instance.pragma("busy_timeout = 5000");
  instance.pragma("foreign_keys = ON");
  return instance;
}

export function getSqlite(): Database.Database {
  if (!globalForDb.__sqlite) {
    globalForDb.__sqlite = createSqliteConnection();
  }
  return globalForDb.__sqlite;
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!globalForDb.__db) {
    globalForDb.__db = drizzle(getSqlite(), { schema });
  }
  return globalForDb.__db;
}

export const sqlite: Database.Database = new Proxy({} as Database.Database, {
  get(_target, prop, receiver) {
    const instance = getSqlite();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export const db: BetterSQLite3Database<typeof schema> = new Proxy(
  {} as BetterSQLite3Database<typeof schema>,
  {
    get(_target, prop, receiver) {
      const instance = getDb();
      const value = Reflect.get(instance, prop, instance);
      return typeof value === "function" ? value.bind(instance) : value;
    },
  }
);

export function ensureTables(): void {
  if (globalForDb.__tablesEnsured) return;
  getSqlite().exec(`
    CREATE TABLE IF NOT EXISTS live_status_cache (
      id INTEGER PRIMARY KEY DEFAULT 1,
      room_id TEXT NOT NULL,
      live_status INTEGER NOT NULL DEFAULT 0,
      title TEXT,
      cover_url TEXT,
      area_name TEXT,
      live_start_at TEXT,
      online_count INTEGER,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS weekly_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opus_id TEXT UNIQUE,
      week_label TEXT,
      caption TEXT,
      image_url TEXT NOT NULL,
      source_url TEXT,
      published_at TEXT NOT NULL,
      is_manual_override INTEGER NOT NULL DEFAULT 0,
      parsed_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS songs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      artist TEXT NOT NULL DEFAULT '',
      language TEXT,
      genre TEXT,
      request_tier TEXT DEFAULT '免费',
      remark TEXT,
      initial TEXT,
      has_clip INTEGER NOT NULL DEFAULT 0,
      source_hash TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS songs_title_artist_idx ON songs(title, artist);

    CREATE TABLE IF NOT EXISTS song_clips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
      source_type TEXT NOT NULL,
      title TEXT,
      audio_url TEXT,
      bvid TEXT,
      page INTEGER DEFAULT 1,
      start_sec INTEGER DEFAULT 0,
      end_sec INTEGER,
      duration_sec INTEGER,
      sung_at TEXT,
      is_primary INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'published',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fan_creations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_uid TEXT,
      source_url TEXT NOT NULL UNIQUE,
      thumb_url TEXT NOT NULL,
      tags TEXT,
      published_at TEXT,
      status TEXT NOT NULL DEFAULT 'approved',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stream_stats_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      range_key TEXT NOT NULL UNIQUE,
      followers INTEGER,
      following INTEGER,
      total_sessions INTEGER,
      total_danmaku INTEGER,
      total_hours REAL,
      danmaku_per_hour REAL,
      recent_sessions_json TEXT,
      source_url TEXT NOT NULL,
      synced_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vstock_snapshots (
      id INTEGER PRIMARY KEY DEFAULT 1,
      name TEXT NOT NULL DEFAULT '風見ロク',
      board_tag TEXT NOT NULL DEFAULT 'V版',
      category TEXT NOT NULL DEFAULT '唱见电台',
      price REAL NOT NULL,
      change_pct REAL NOT NULL,
      change_amount REAL NOT NULL,
      nav REAL NOT NULL,
      pb REAL NOT NULL,
      pb_status TEXT NOT NULL,
      limit_low REAL NOT NULL,
      limit_high REAL NOT NULL,
      dps REAL NOT NULL,
      dividend_yield REAL NOT NULL,
      trades_24h INTEGER NOT NULL DEFAULT 0,
      traders_24h INTEGER NOT NULL DEFAULT 0,
      long_ratio REAL NOT NULL DEFAULT 50,
      short_ratio REAL NOT NULL DEFAULT 50,
      ema_activity INTEGER NOT NULL DEFAULT 0,
      lives_30d INTEGER NOT NULL DEFAULT 0,
      danmaku_30d INTEGER NOT NULL DEFAULT 0,
      sparkline_7d_json TEXT NOT NULL,
      source_url TEXT NOT NULL,
      synced_at TEXT NOT NULL
    );
  `);

  const scheduleCols = getSqlite()
    .prepare("PRAGMA table_info(weekly_schedules)")
    .all() as Array<{ name: string }>;
  if (!scheduleCols.some((col) => col.name === "parsed_json")) {
    getSqlite().exec("ALTER TABLE weekly_schedules ADD COLUMN parsed_json TEXT;");
  }

  globalForDb.__tablesEnsured = true;
}
