import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getVolume, getList, addToList } from "../api";
import type { ComicDetail } from "../types";
import Cover from "../components/Cover";

const PALETTE = ["#1d4ed8", "#138a8a", "#ef3e2c", "#7c2d12", "#3b2a5a", "#166534", "#f26ca7", "#b45309"];
function colorFor(t: string) {
  let h = 0;
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export default function Detail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [comic, setComic] = useState<ComicDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [error, setError] = useState("");
  const [inList, setInList] = useState(false);

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    Promise.all([getVolume(Number(id)), getList()])
      .then(([detail, list]) => {
        if (!alive) return;
        setComic(detail);
        setInList(list.some((i) => i.volumeId === detail.id));
        setStatus("done");
      })
      .catch((e) => {
        if (!alive) return;
        setError(e.message);
        setStatus("error");
      });
    return () => { alive = false; };
  }, [id]);

  async function add() {
    if (!comic || inList) return;
    await addToList(comic, "to-read");
    setInList(true);
  }

  if (status === "loading") return <div className="loading">Pulling the issue…</div>;
  if (status === "error") return <div className="notice error">⚠ {error}</div>;
  if (!comic) return null;

  return (
    <section>
      <button className="back" onClick={() => navigate(-1)}>← Back</button>

      <div className="detail">
        <div className="big-cover">
          {comic.image ? (
            <div className="art"><img src={comic.image} alt={comic.title} /></div>
          ) : (
            <div className="art fallback" style={{ background: colorFor(comic.title) }}>
              <span className="ct">{comic.title}</span>
            </div>
          )}
        </div>

        <div>
          <h1 className="dt-title">{comic.title}</h1>
          {comic.creators.length > 0 && (
            <div className="dt-credits">Credits · <b>{comic.creators.join(" · ")}</b></div>
          )}
          <div className="dt-tags">
            {comic.publisher && <span className="tag">{comic.publisher}</span>}
            {comic.year && <span className="tag">{comic.year}</span>}
            {comic.totalIssues > 0 && <span className="tag">{comic.totalIssues} issues</span>}
            {comic.concepts.slice(0, 2).map((c) => <span key={c} className="tag">{c}</span>)}
          </div>

          <p className="summary">
            {comic.summary || comic.deck || "No summary available for this title yet."}
          </p>

          <div className="actions">
            <button className={"btn-stamp btn-add" + (inList ? " in-list" : "")} onClick={add}>
              {inList ? "✓ In your list" : "+ Add to list"}
            </button>
            <a className="btn-stamp btn-buy" href={comic.buyLink} target="_blank" rel="noreferrer">
              Buy (print) →
            </a>
          </div>

          {comic.recommendations.length > 0 && (
            <div className="recos">
              <h3>In the same vein</h3>
              <div className="sub">// publisher · creators · characters</div>
              <div className="reco-row">
                {comic.recommendations.map((r) => <Cover key={r.id} comic={r} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}