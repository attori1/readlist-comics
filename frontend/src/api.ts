import type { ComicSummary, ComicDetail, ListItem, Status } from "./types";

const BASE = "http://localhost:3000";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export async function search(q: string): Promise<ComicSummary[]> {
  const res = await fetch(`${BASE}/api/search?q=${encodeURIComponent(q)}`);
  const data = await json<{ results: ComicSummary[] }>(res);
  return data.results;
}

export async function getVolume(id: number): Promise<ComicDetail> {
  return json<ComicDetail>(await fetch(`${BASE}/api/volume/${id}`));
}

export async function getRandom(): Promise<ComicDetail> {
  return json<ComicDetail>(await fetch(`${BASE}/api/random`));
}

export async function getList(): Promise<ListItem[]> {
  return json<ListItem[]>(await fetch(`${BASE}/api/list`));
}

export async function addToList(volume: ComicSummary, status: Status = "to-read"): Promise<ListItem> {
  const res = await fetch(`${BASE}/api/list`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ volume, status }),
  });
  return json<ListItem>(res);
}

export async function updateItem(id: string, patch: Partial<ListItem>): Promise<ListItem> {
  const res = await fetch(`${BASE}/api/list/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return json<ListItem>(res);
}

export async function removeItem(id: string): Promise<void> {
  await fetch(`${BASE}/api/list/${id}`, { method: "DELETE" });
}