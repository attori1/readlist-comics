import { Link } from "react-router-dom";
import type { ComicSummary } from "../types";

const PALETTE = ["#1d4ed8", "#138a8a", "#ef3e2c", "#7c2d12", "#3b2a5a", "#166534", "#f26ca7", "#b45309"];

function colorFor(title: string): string {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export default function Cover({ comic }: { comic: ComicSummary }) {
  return (
    <Link className="cover" to={`/comic/${comic.id}`}>
      {comic.image ? (
        <div className="art">
          <img src={comic.image} alt={comic.title} loading="lazy" />
        </div>
      ) : (
        <div className="art fallback" style={{ background: colorFor(comic.title) }}>
          <span className="cn">{comic.publisher}{comic.year ? ` · ${comic.year}` : ""}</span>
          <span className="ct">{comic.title}</span>
        </div>
      )}
      <div className="meta">
        <span className="ttl">{comic.title}</span>
        {comic.year && <span className="yr">'{String(comic.year).slice(2)}</span>}
      </div>
    </Link>
  );
}