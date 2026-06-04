import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = join(__dirname, "..", "data.json");

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

type DB = { items: ListItem[] };

async function read(): Promise<DB> {
  if (!existsSync(FILE)) return { items: [] };
  try {
    return JSON.parse(await readFile(FILE, "utf8"));
  } catch {
    return { items: [] };
  }
}

async function write(db: DB): Promise<void> {
  await writeFile(FILE, JSON.stringify(db, null, 2), "utf8");
}

export async function getList(): Promise<ListItem[]> {
  return (await read()).items;
}

export async function addItem(item: Omit<ListItem, "id" | "addedAt">): Promise<ListItem> {
  const db = await read();
  const existing = db.items.find((i) => i.volumeId === item.volumeId);
  if (existing) return existing;

  const newItem: ListItem = { ...item, id: crypto.randomUUID(), addedAt: new Date().toISOString() };
  db.items.push(newItem);
  await write(db);
  return newItem;
}

export async function updateItem(id: string, patch: Partial<ListItem>): Promise<ListItem | null> {
  const db = await read();
  const item = db.items.find((i) => i.id === id);
  if (!item) return null;

  Object.assign(item, patch);

  // finished every issue -> mark done automatically
  if (item.status === "reading" && item.totalIssues > 0 && item.progress >= item.totalIssues) {
    item.status = "done";
    item.progress = item.totalIssues;
    item.readNextRank = null;
  }

  // Read Next holds 5 max: drop the lowest priority if we go over
  if (patch.readNextRank != null) {
    const ranked = db.items
      .filter((i) => i.readNextRank != null && i.id !== id)
      .sort((a, b) => a.readNextRank! - b.readNextRank!);
    if (ranked.length >= 5) ranked[ranked.length - 1].readNextRank = null;
  }

  await write(db);
  return item;
}

export async function removeItem(id: string): Promise<boolean> {
  const db = await read();
  const before = db.items.length;
  db.items = db.items.filter((i) => i.id !== id);
  await write(db);
  return db.items.length < before;
}