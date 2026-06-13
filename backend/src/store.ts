import db from "./db.js";

export type Status = "to-read" | "reading" | "done";

export type ListItem = {
  id: string;
  volumeId: number;
  title: string;
  publisher: string;
  year: number | null;
  image: string;
  totalIssues: number;
  status: Status;
  progress: number;
  rating: number;
  readNextRank: number | null;
  addedAt: string;
};

// DB rows are snake_case, the API speaks camelCase
function rowToItem(r: any): ListItem {
  return {
    id: r.id,
    volumeId: r.volume_id,
    title: r.title,
    publisher: r.publisher ?? "Unknown",
    year: r.year,
    image: r.image ?? "",
    totalIssues: r.total_issues,
    status: r.status,
    progress: r.progress,
    rating: r.rating,
    readNextRank: r.read_next_rank,
    addedAt: r.added_at,
  };
}

export function getList(userId = "local"): ListItem[] {
  const rows = db.prepare("SELECT * FROM items WHERE user_id = ? ORDER BY added_at DESC").all(userId);
  return rows.map(rowToItem);
}

export function addItem(item: Omit<ListItem, "id" | "addedAt">, userId = "local"): ListItem {
  const existing = db
    .prepare("SELECT * FROM items WHERE user_id = ? AND volume_id = ?")
    .get(userId, item.volumeId);
  if (existing) return rowToItem(existing);

  const id = crypto.randomUUID();
  const addedAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO items (id, user_id, volume_id, title, publisher, year, image, total_issues, status, progress, rating, read_next_rank, added_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, userId, item.volumeId, item.title, item.publisher, item.year, item.image,
    item.totalIssues, item.status, item.progress, item.rating, item.readNextRank, addedAt
  );
  return rowToItem(db.prepare("SELECT * FROM items WHERE id = ?").get(id));
}

export function updateItem(id: string, patch: Partial<ListItem>): ListItem | null {
  const row: any = db.prepare("SELECT * FROM items WHERE id = ?").get(id);
  if (!row) return null;
  const item = rowToItem(row);

  // log progress changes so we can compute a reading pace later
  if (patch.progress != null && patch.progress !== item.progress) {
    db.prepare("INSERT INTO progress_log (item_id, delta, logged_at) VALUES (?, ?, ?)")
      .run(id, patch.progress - item.progress, new Date().toISOString());
  }

  const merged = { ...item, ...patch };

  // finished every issue -> mark done automatically
  if (merged.status === "reading" && merged.totalIssues > 0 && merged.progress >= merged.totalIssues) {
    merged.status = "done";
    merged.progress = merged.totalIssues;
    merged.readNextRank = null;
  }

  // Read Next holds 5 max: drop the lowest priority if we go over
  if (patch.readNextRank != null) {
    const ranked: any[] = db
      .prepare("SELECT id, read_next_rank FROM items WHERE read_next_rank IS NOT NULL AND id != ? ORDER BY read_next_rank")
      .all(id);
    if (ranked.length >= 5) {
      db.prepare("UPDATE items SET read_next_rank = NULL WHERE id = ?").run(ranked[ranked.length - 1].id);
    }
  }

  db.prepare(`
    UPDATE items SET status = ?, progress = ?, rating = ?, read_next_rank = ?, total_issues = ?
    WHERE id = ?
  `).run(merged.status, merged.progress, merged.rating, merged.readNextRank, merged.totalIssues, id);

  return rowToItem(db.prepare("SELECT * FROM items WHERE id = ?").get(id));
}

export function removeItem(id: string): boolean {
  return db.prepare("DELETE FROM items WHERE id = ?").run(id).changes > 0;
}