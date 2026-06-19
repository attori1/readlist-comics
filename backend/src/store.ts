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
  lastReadAt: string | null;
};

export type Stats = {
  readLast60: number;
  pacePerWeek: number;
  remaining: number;
  projectedFinish: string | null;
  perMonth: { month: string; count: number }[];
  continueReading: ListItem | null;
};

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
    lastReadAt: r.last_read_at ?? null,
  };
}

export function getList(userId = "local"): ListItem[] {
  const rows = db.prepare(`
    SELECT items.*,
           (SELECT MAX(logged_at) FROM progress_log WHERE item_id = items.id) AS last_read_at
    FROM items WHERE user_id = ? ORDER BY added_at DESC
  `).all(userId);
  return rows.map(rowToItem);
}

export function addItem(item: Omit<ListItem, "id" | "addedAt" | "lastReadAt">, userId = "local"): ListItem {
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

export function updateItem(id: string, patch: Partial<ListItem>, userId = "local"): ListItem | null {
  const row: any = db.prepare("SELECT * FROM items WHERE id = ? AND user_id = ?").get(id, userId);
  if (!row) return null;
  const item = rowToItem(row);

  if (patch.progress != null && patch.progress !== item.progress) {
    db.prepare("INSERT INTO progress_log (item_id, delta, logged_at) VALUES (?, ?, ?)")
      .run(id, patch.progress - item.progress, new Date().toISOString());
  }

  const merged = { ...item, ...patch };

  if (merged.status === "reading" && merged.totalIssues > 0 && merged.progress >= merged.totalIssues) {
    merged.status = "done";
    merged.progress = merged.totalIssues;
    merged.readNextRank = null;
  }

  if (patch.readNextRank != null) {
    const ranked: any[] = db
      .prepare("SELECT id, read_next_rank FROM items WHERE user_id = ? AND read_next_rank IS NOT NULL AND id != ? ORDER BY read_next_rank")
      .all(userId, id);
    if (ranked.length >= 5) {
      db.prepare("UPDATE items SET read_next_rank = NULL WHERE id = ?").run(ranked[ranked.length - 1].id);
    }
  }

  db.prepare(`
    UPDATE items SET status = ?, progress = ?, rating = ?, read_next_rank = ?, total_issues = ?
    WHERE id = ?
  `).run(merged.status, merged.progress, merged.rating, merged.readNextRank, merged.totalIssues, id);

  const fresh: any = db.prepare(`
    SELECT items.*, (SELECT MAX(logged_at) FROM progress_log WHERE item_id = items.id) AS last_read_at
    FROM items WHERE id = ?
  `).get(id);
  return rowToItem(fresh);
}

export function removeItem(id: string, userId = "local"): boolean {
  return db.prepare("DELETE FROM items WHERE id = ? AND user_id = ?").run(id, userId).changes > 0;
}

export function getStats(userId = "local"): Stats {
  const now = Date.now();
  const since = new Date(now - 60 * 24 * 3600 * 1000).toISOString();

  // issues read in the last 60 days (only positive deltas count)
  const recent: any = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END), 0) AS read
    FROM progress_log
    JOIN items ON items.id = progress_log.item_id
    WHERE items.user_id = ? AND progress_log.logged_at >= ?
  `).get(userId, since);
  const readLast60 = recent.read as number;
  const pacePerWeek = Math.round((readLast60 / (60 / 7)) * 100) / 100;

  // issues left across everything you're currently reading
  const rem: any = db.prepare(`
    SELECT COALESCE(SUM(max(total_issues - progress, 0)), 0) AS remaining
    FROM items WHERE user_id = ? AND status = 'reading'
  `).get(userId);
  const remaining = rem.remaining as number;

  const projectedFinish =
    pacePerWeek > 0 && remaining > 0
      ? new Date(now + (remaining / pacePerWeek) * 7 * 24 * 3600 * 1000).toISOString().slice(0, 10)
      : null;

  const perMonthRows: any[] = db.prepare(`
    SELECT substr(progress_log.logged_at, 1, 7) AS month,
           SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END) AS count
    FROM progress_log
    JOIN items ON items.id = progress_log.item_id
    WHERE items.user_id = ?
    GROUP BY month ORDER BY month DESC LIMIT 6
  `).all(userId);
  const perMonth = perMonthRows
    .map((r) => ({ month: r.month as string, count: r.count as number }))
    .reverse();

  // most recently progressed reading item = "continue reading"
  const cont: any = db.prepare(`
    SELECT items.*, (SELECT MAX(logged_at) FROM progress_log WHERE item_id = items.id) AS last_read_at
    FROM items
    JOIN progress_log ON progress_log.item_id = items.id
    WHERE items.user_id = ? AND items.status = 'reading'
    ORDER BY progress_log.logged_at DESC LIMIT 1
  `).get(userId);
  const continueReading = cont ? rowToItem(cont) : null;

  return { readLast60, pacePerWeek, remaining, projectedFinish, perMonth, continueReading };
}

export function exportData(userId = "local") {
  const items: any[] = db.prepare("SELECT * FROM items WHERE user_id = ?").all(userId);
  const ids = items.map((i) => i.id);
  const progressLog = ids.length
    ? db.prepare(
        `SELECT item_id, delta, logged_at FROM progress_log WHERE item_id IN (${ids.map(() => "?").join(",")})`
      ).all(...ids)
    : [];
  return { exportedAt: new Date().toISOString(), items, progressLog };
}

export function importData(data: { items: any[]; progressLog?: any[] }, userId = "local") {
  const items = data.items ?? [];
  const log = data.progressLog ?? [];

  // run as one atomic transaction: if anything fails, nothing changes
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM progress_log WHERE item_id IN (SELECT id FROM items WHERE user_id = ?)").run(userId);
    db.prepare("DELETE FROM items WHERE user_id = ?").run(userId);

    const insItem = db.prepare(`
      INSERT INTO items (id, user_id, volume_id, title, publisher, year, image, total_issues, status, progress, rating, read_next_rank, added_at)
      VALUES (@id, @user_id, @volume_id, @title, @publisher, @year, @image, @total_issues, @status, @progress, @rating, @read_next_rank, @added_at)
    `);
    for (const it of items) {
      insItem.run({
        id: it.id ?? crypto.randomUUID(),
        user_id: userId,
        volume_id: it.volume_id,
        title: it.title,
        publisher: it.publisher ?? null,
        year: it.year ?? null,
        image: it.image ?? "",
        total_issues: it.total_issues ?? 0,
        status: it.status ?? "to-read",
        progress: it.progress ?? 0,
        rating: it.rating ?? 0,
        read_next_rank: it.read_next_rank ?? null,
        added_at: it.added_at ?? new Date().toISOString(),
      });
    }

    const insLog = db.prepare("INSERT INTO progress_log (item_id, delta, logged_at) VALUES (@item_id, @delta, @logged_at)");
    for (const l of log) {
      insLog.run({ item_id: l.item_id, delta: l.delta, logged_at: l.logged_at });
    }
  });
  tx();

  return getList(userId);
}