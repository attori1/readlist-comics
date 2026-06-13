import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";

import { searchVolumes, getVolume, getRandom, getRecommendations, type ComicDetail } from "./comicvine.js";
import { getList, addItem, updateItem, removeItem } from "./store.js";

const app = new Hono();
app.use("/*", cors());

const BUY_BASE = process.env.BUY_BASE_URL ?? "https://www.amazon.com/s?k=";
const buyLink = (title: string) => BUY_BASE + encodeURIComponent(`${title} comic graphic novel`);

app.get("/", (c) => c.text("watchlist backend is running"));

app.get("/api/search", async (c) => {
  const q = c.req.query("q")?.trim();
  if (!q) return c.json({ results: [] });
  try {
    return c.json({ results: await searchVolumes(q) });
  } catch (err: any) {
    return c.json({ error: err.message }, 502);
  }
});

app.get("/api/volume/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!id) return c.json({ error: "bad id" }, 400);
  try {
    const detail: ComicDetail = await getVolume(id);
    const recommendations = await getRecommendations(detail);
    return c.json({ ...detail, buyLink: buyLink(detail.title), recommendations });
  } catch (err: any) {
    return c.json({ error: err.message }, 502);
  }
});

app.get("/api/random", async (c) => {
  try {
    const detail = await getRandom();
    const recommendations = await getRecommendations(detail);
    return c.json({ ...detail, buyLink: buyLink(detail.title), recommendations });
  } catch (err: any) {
    return c.json({ error: err.message }, 502);
  }
});

app.get("/api/list", (c) => c.json(getList()));

app.post("/api/list", async (c) => {
  const body = await c.req.json();
  const v = body.volume;
  if (!v?.id) return c.json({ error: "missing volume" }, 400);
  const item = addItem({
    volumeId: v.id,
    title: v.title,
    publisher: v.publisher,
    year: v.year ?? null,
    image: v.image ?? "",
    totalIssues: v.totalIssues ?? 0,
    status: body.status ?? "to-read",
    progress: 0,
    rating: 0,
    readNextRank: null,
  });
  return c.json(item);
});

app.patch("/api/list/:id", async (c) => {
  const item = updateItem(c.req.param("id"), await c.req.json());
  if (!item) return c.json({ error: "not found" }, 404);
  return c.json(item);
});

app.delete("/api/list/:id", (c) => {
  return c.json({ ok: removeItem(c.req.param("id")) });
});

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`watchlist backend on http://localhost:${info.port}`);
  if (!process.env.COMICVINE_API_KEY) {
    console.warn("No COMICVINE_API_KEY found - copy .env.example to .env and add your key.");
  }
});