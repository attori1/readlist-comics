const API_KEY = process.env.COMICVINE_API_KEY ?? "";
const BASE = "https://comicvine.gamespot.com/api";

// ComicVine rejects requests without a real User-Agent.
const HEADERS = { "User-Agent": "watchlist/1.0 (personal project)" };

type CacheEntry = { value: unknown; expires: number };
const cache = new Map<string, CacheEntry>();
const TTL = 1000 * 60 * 30;

async function cvFetch(path: string): Promise<any> {
  if (!API_KEY) {
    throw new Error("Missing COMICVINE_API_KEY. Copy .env.example to .env and add your key.");
  }
  const sep = path.includes("?") ? "&" : "?";
  const url = `${BASE}${path}${sep}api_key=${API_KEY}&format=json`;

  const cached = cache.get(url);
  if (cached && cached.expires > Date.now()) return cached.value;

  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`ComicVine HTTP ${res.status}`);
  const data: any = await res.json();
  if (data.status_code !== 1) {
    throw new Error(`ComicVine error: ${data.error ?? "unknown"}`);
  }
  cache.set(url, { value: data, expires: Date.now() + TTL });
  return data;
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function pickImage(image: any): string {
  if (!image) return "";
  return image.medium_url || image.small_url || image.original_url || image.screen_url || "";
}

export type ComicSummary = {
  id: number;
  title: string;
  publisher: string;
  year: number | null;
  image: string;
  totalIssues: number;
};

export type ComicDetail = ComicSummary & {
  deck: string;
  summary: string;
  creators: string[];
  characters: string[];
  concepts: string[];
};

function mapVolume(v: any): ComicSummary {
  return {
    id: v.id,
    title: v.name ?? "Untitled",
    publisher: v.publisher?.name ?? "Unknown",
    year: v.start_year ? Number(v.start_year) : null,
    image: pickImage(v.image),
    totalIssues: v.count_of_issues ?? 0,
  };
}

export async function searchVolumes(query: string, limit = 30): Promise<ComicSummary[]> {
  const fields = "id,name,image,start_year,publisher,count_of_issues";
  const data = await cvFetch(
    `/search/?query=${encodeURIComponent(query)}&resources=volume&field_list=${fields}&limit=${limit}`
  );
  return (data.results as any[])
    .filter((v) => v?.id)
    .map(mapVolume)
    .sort((a, b) => Number(!!b.image) - Number(!!a.image));
}

export async function getVolume(id: number): Promise<ComicDetail> {
  const fields =
    "id,name,image,start_year,publisher,count_of_issues,description,deck,people,characters,concepts";
  // the /volume/ endpoint wants the id prefixed with 4050-
  const data = await cvFetch(`/volume/4050-${id}/?field_list=${fields}`);
  const v = data.results;

  const creators = (v.people ?? [])
    .filter((p: any) => /writer|artist|penciler|inker|cover|colorist/i.test(p.role ?? ""))
    .slice(0, 6)
    .map((p: any) => p.name);

  return {
    ...mapVolume(v),
    deck: v.deck ?? "",
    summary: stripHtml(v.description).slice(0, 900),
    creators,
    characters: (v.characters ?? []).slice(0, 8).map((c: any) => c.name),
    concepts: (v.concepts ?? []).slice(0, 6).map((c: any) => c.name),
  };
}

// searched by name rather than hard-coded ids so it keeps working over time
const RANDOM_PICKS = [
  "Batman The Court of Owls", "Daredevil Born Again", "Daredevil Frank Miller",
  "Watchmen", "Batman Year One", "The Dark Knight Returns", "All-Star Superman",
  "Saga", "The Sandman", "Y The Last Man", "Hawkeye Matt Fraction",
  "The Vision Tom King", "Mister Miracle", "Planetary", "Transmetropolitan",
  "Preacher", "East of West", "Paper Girls", "Monstress", "The Boys",
  "Invincible", "Sweet Tooth", "Locke and Key", "Black Hole", "Sin City",
  "Kingdom Come", "Marvels", "Daytripper", "We3", "Pride of Baghdad",
  "Superman Red Son", "Old Man Logan", "Civil War", "Annihilation",
  "Swamp Thing Alan Moore", "Animal Man Grant Morrison", "Doom Patrol Morrison",
  "Gideon Falls", "Descender", "Wytches", "Southern Bastards", "Deadly Class",
];

export async function getRandom(): Promise<ComicDetail> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const name = RANDOM_PICKS[Math.floor(Math.random() * RANDOM_PICKS.length)];
    const hits = await searchVolumes(name, 5);
    const best = hits.find((h) => h.image && h.totalIssues > 0) ?? hits[0];
    if (best) return getVolume(best.id);
  }
  const hits = await searchVolumes("Saga", 1);
  return getVolume(hits[0].id);
}

export async function getRecommendations(detail: ComicDetail): Promise<ComicSummary[]> {
  const seeds: string[] = [];
  if (detail.creators[0]) seeds.push(detail.creators[0]);
  if (detail.characters[0]) seeds.push(detail.characters[0]);
  if (detail.concepts[0]) seeds.push(detail.concepts[0]);
  if (seeds.length === 0) seeds.push(detail.publisher);

  const collected = new Map<number, ComicSummary>();
  for (const seed of seeds) {
    try {
      const hits = await searchVolumes(seed, 8);
      for (const h of hits) {
        if (h.id !== detail.id && h.image && !collected.has(h.id)) {
          collected.set(h.id, h);
        }
      }
    } catch {
      // a bad seed shouldn't kill the whole thing
    }
    if (collected.size >= 6) break;
  }
  return [...collected.values()].slice(0, 6);
}