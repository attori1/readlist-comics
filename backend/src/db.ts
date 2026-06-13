import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, "..", "watchlist.db"));

// WAL = better concurrency between reads and writes
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'local',
    volume_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    publisher TEXT,
    year INTEGER,
    image TEXT,
    total_issues INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'to-read',
    progress INTEGER NOT NULL DEFAULT 0,
    rating INTEGER NOT NULL DEFAULT 0,
    read_next_rank INTEGER,
    added_at TEXT NOT NULL,
    UNIQUE(user_id, volume_id)
  );

  CREATE TABLE IF NOT EXISTS progress_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id TEXT NOT NULL,
    delta INTEGER NOT NULL,
    logged_at TEXT NOT NULL,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
  );
`);

export default db;