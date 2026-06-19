import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";

import { searchVolumes, getVolume, getRandom, getRecommendations, type ComicDetail } from "./comicvine.js";
import { getList, addItem, updateItem, removeItem, getStats, exportData, importData } from "./store.js";
import { createUser, findUserByEmail, verifyPassword, createSession, getUserByToken, deleteSession } from "./auth.js";

const app = new Hono<{ Variables: { userId: string } }>();
app.use("/*", cors());

const COOKIE = "session";
const BUY_BASE = process.env.BUY_BASE_URL ?? "https://www.amazon.com/s?k=";
const buyLink = (title: string) => BUY_BASE + encodeURIComponent(`${title} comic graphic novel`);

function readLink(publisher: string, title: string): { label: string; url: string } {
  const p = (publisher || "").toLowerCase();
  const q = encodeURIComponent(title);
  if (p.includes("marvel")) return { label: "Read on Marvel Unlimited", url: `https://www.marvel.com/comics/search?text=${q}` };
  if (p.includes("dc")) return { label: "Read on DC Universe Infinite", url: `https://www.dcuniverseinfinite.com/search?q=${q}` };
  return { label: "Read on Kindle", url: `https://www.amazon.com/s?k=${q}+comixology+kindle` };
}

// require a valid session; puts the user id on the context
const requireAuth = async (c: any, next: any) => {
  const token = getCookie(c, COOKIE);
  const user = token ? getUserByToken(token) : null;
  if (!user) return c.json({ error: "Not authenticated" }, 401);
  c.set("userId", user.id);
  await next();
};

app.get("/", (c) => c.text("watchlist backend is running"));

// ---- auth ----
app.post("/api/auth/register", async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password || password.length < 6) {
    return c.json({ error: "Email and a password of 6+ characters are required" }, 400);
  }
  if (findUserByEmail(email)) return c.json({ error: "Email already registered" }, 409);
  const user = createUser(email, password);
  const token = createSession(user.id);
  setCookie(c, COOKIE, token, { httpOnly: true, sameSite: "Lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return c.json({ user });
});

app.post("/api/auth/login", async (c) => {
  const { email, password } = await c.req.json();
  const row = findUserByEmail(email);
  if (!row || !verifyPassword(password, row.password_hash)) {
    return c.json({ error: "Invalid email or password" }, 401);
  }
  const token = createSession(row.id);
  setCookie(c, COOKIE, token, { httpOnly: true, sameSite: "Lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return c.json({ user: { id: row.id, email: row.email } });
});

app.post("/api/auth/logout", (c) => {
  const token = getCookie(c, COOKIE);
  if (token) deleteSession(token);
  deleteCookie(c, COOKIE, { path: "/" });
  return c.json({ ok: true });
});

app.get("/api/auth/me", (c) => {
  const token = getCookie(c, COOKIE);
  const user = token ? getUserByToken(token) : null;
  return c.json({ user });
});

// ---- public ComicVine routes (no login needed to browse) ----
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
    return c.json({ ...detail, buyLink: buyLink(detail.title), readLink: readLink(detail.publisher, detail.title), recommendations });
  } catch (err: any) {
    return c.json({ error: err.message }, 502);
  }
});

app.get("/api/random", async (c) => {
  try {
    const detail = await getRandom();
    const recommendations = await getRecommendations(detail);
    return c.json({ ...detail, buyLink: buyLink(detail.title), readLink: readLink(detail.publisher, detail.title), recommendations });
  } catch (err: any) {
    return c.json({ error: err.message }, 502);
  }
});

// ---- everything below requires a logged-in user ----
app.use("/api/list", requireAuth);
app.use("/api/list/*", requireAuth);
app.use("/api/stats", requireAuth);
app.use("/api/export", requireAuth);
app.use("/api/import", requireAuth);

app.get("/api/list", (c) => c.json(getList(c.get("userId"))));

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
  }, c.get("userId"));
  return c.json(item);
});

app.patch("/api/list/:id", async (c) => {
  const item = updateItem(c.req.param("id"), await c.req.json(), c.get("userId"));
  if (!item) return c.json({ error: "not found" }, 404);
  return c.json(item);
});

app.delete("/api/list/:id", (c) => {
  return c.json({ ok: removeItem(c.req.param("id"), c.get("userId")) });
});

app.get("/api/stats", (c) => c.json(getStats(c.get("userId"))));

app.get("/api/export", (c) => c.json(exportData(c.get("userId"))));

app.post("/api/import", async (c) => {
  const data = await c.req.json();
  if (!data || !Array.isArray(data.items)) return c.json({ error: "invalid backup file" }, 400);
  const list = importData(data, c.get("userId"));
  return c.json({ ok: true, count: list.length });
});

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`watchlist backend on http://localhost:${info.port}`);
  if (!process.env.COMICVINE_API_KEY) {
    console.warn("No COMICVINE_API_KEY found - copy .env.example to .env and add your key.");
  }
});