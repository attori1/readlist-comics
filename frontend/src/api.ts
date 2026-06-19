import type { ComicSummary, ComicDetail, ListItem, Status, Stats, User } from "./types";

const BASE = ""; // relative -> goes through the Vite proxy to the backend

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export async function search(q: string): Promise<ComicSummary[]> {
  const data = await json<{ results: ComicSummary[] }>(await fetch(`${BASE}/api/search?q=${encodeURIComponent(q)}`));
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
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ volume, status }),
  });
  return json<ListItem>(res);
}

export async function updateItem(id: string, patch: Partial<ListItem>): Promise<ListItem> {
  const res = await fetch(`${BASE}/api/list/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return json<ListItem>(res);
}

export async function removeItem(id: string): Promise<void> {
  await fetch(`${BASE}/api/list/${id}`, { method: "DELETE" });
}

export async function getStats(): Promise<Stats> {
  return json<Stats>(await fetch(`${BASE}/api/stats`));
}

export async function exportData(): Promise<any> {
  return json<any>(await fetch(`${BASE}/api/export`));
}

export async function importData(data: any): Promise<{ ok: boolean; count: number }> {
  const res = await fetch(`${BASE}/api/import`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return json(res);
}

export async function authMe(): Promise<User | null> {
  const { user } = await json<{ user: User | null }>(await fetch(`${BASE}/api/auth/me`));
  return user;
}

export async function authRegister(email: string, password: string): Promise<User> {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return (await json<{ user: User }>(res)).user;
}

export async function authLogin(email: string, password: string): Promise<User> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return (await json<{ user: User }>(res)).user;
}

export async function authLogout(): Promise<void> {
  await fetch(`${BASE}/api/auth/logout`, { method: "POST" });
}