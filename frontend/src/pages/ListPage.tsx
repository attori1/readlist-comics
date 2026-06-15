import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getList, updateItem, removeItem } from "../api";
import type { ListItem } from "../types";

export default function ListPage() {
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function reload() {
    try {
      setItems(await getList());
      setError("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); }, []);

  async function patch(id: string, p: Partial<ListItem>) {
    await updateItem(id, p);
    await reload();
  }
  async function remove(id: string) {
    await removeItem(id);
    await reload();
  }

  const readNext = items
    .filter((i) => i.readNextRank != null)
    .sort((a, b) => (a.readNextRank! - b.readNextRank!));

  const continueItem =
    items
      .filter((i) => i.status === "reading" && i.lastReadAt)
      .sort((a, b) => (b.lastReadAt! > a.lastReadAt! ? 1 : -1))[0] ?? null;

  async function togglePin(item: ListItem) {
    if (item.readNextRank != null) {
      await patch(item.id, { readNextRank: null });
    } else {
      if (readNext.length >= 5) { alert("Read Next is full (max 5). Unpin one first."); return; }
      const nextRank = (Math.max(0, ...readNext.map((i) => i.readNextRank!)) || 0) + 1;
      await patch(item.id, { readNextRank: nextRank });
    }
  }

  const todo = items.filter((i) => i.status === "to-read");
  const reading = items.filter((i) => i.status === "reading");
  const done = items.filter((i) => i.status === "done");

  if (loading) return <div className="loading">Opening your watchlist…</div>;

  return (
    <section>
      <div className="page-head">
        <h1 className="page-title"><span className="kick">// Your watchlist</span>My List</h1>
      </div>

      {continueItem && (
        <div className="continue">
          <div>
            <div className="lbl">Continue reading</div>
            <div className="ct-title">{continueItem.title}</div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span className="lbl">{continueItem.progress} / {continueItem.totalIssues || "?"}</span>
            <button
              className="resume"
              onClick={() => patch(continueItem.id, { progress: continueItem.progress + 1, status: "reading" })}
            >
              +1 issue ✓
            </button>
          </div>
        </div>
      )}

      {error && <div className="notice error">⚠ {error}</div>}

      <div className="readnext">
        <div className="rn-head">Read Next <span className="cap">priority · max 5</span></div>
        {readNext.length === 0 ? (
          <div className="rn-empty">Nothing pinned. Hit “★ Read next” on any comic to queue it here.</div>
        ) : (
          <div className="rn-body">
            {readNext.map((i) => (
              <div className="rn-chip" key={i.id}>
                <span className="rank">{i.readNextRank}</span>
                <Link to={`/comic/${i.volumeId}`} className="rn-title">{i.title}</Link>
                <button className="x" onClick={() => patch(i.id, { readNextRank: null })} title="Unpin">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="columns">
        <div className="col todo">
          <div className="col-head">To Read <span className="count">{todo.length}</span></div>
          <div className="col-body">
            {todo.length === 0 && <div className="col-empty">— empty —</div>}
            {todo.map((i) => (
              <div className="item" key={i.id}>
                <Link to={`/comic/${i.volumeId}`} className="it-title">{i.title}</Link>
                <div className="it-series">{i.publisher}{i.totalIssues ? ` · ${i.totalIssues} issues` : ""}</div>
                <div className="row-actions">
                  <button className="mini-btn" onClick={() => patch(i.id, { status: "reading" })}>▶ Start</button>
                  <button className={"mini-btn" + (i.readNextRank != null ? " pinned" : "")} onClick={() => togglePin(i)}>★ Read next</button>
                  <button className="mini-btn" onClick={() => remove(i.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col doing">
          <div className="col-head">Reading <span className="count">{reading.length}</span></div>
          <div className="col-body">
            {reading.length === 0 && <div className="col-empty">— empty —</div>}
            {reading.map((i) => {
              const pct = i.totalIssues > 0 ? Math.round((i.progress / i.totalIssues) * 100) : 0;
              const almost = i.totalIssues > 0 && i.progress >= i.totalIssues - 2 && i.progress < i.totalIssues;
              return (
                <div className="item" key={i.id}>
                  <Link to={`/comic/${i.volumeId}`} className="it-title">{i.title}</Link>
                  <div className="it-series">{i.publisher}</div>
                  <div className="counter">
                    <button onClick={() => patch(i.id, { progress: Math.max(0, i.progress - 1) })}>−</button>
                    <span className="num"><b>{i.progress}</b> / {i.totalIssues || "?"}</span>
                    <button onClick={() => patch(i.id, { progress: i.progress + 1, status: "reading" })}>+</button>
                  </div>
                  {i.totalIssues > 0 && (
                    <div className="progress"><div className="fill" style={{ width: `${pct}%` }} /></div>
                  )}
                  {almost && <span className="ribbon">almost done!</span>}
                  {i.totalIssues === 0 && (
                    <div className="row-actions"><button className="mini-btn" onClick={() => patch(i.id, { status: "done" })}>✓ Mark done</button></div>
                  )}
                  <Stars value={i.rating} onSet={(n) => patch(i.id, { rating: n })} />
                  <div className="row-actions">
                    <button className={"mini-btn" + (i.readNextRank != null ? " pinned" : "")} onClick={() => togglePin(i)}>★ Read next</button>
                    <button className="mini-btn" onClick={() => remove(i.id)}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="col done">
          <div className="col-head">Done <span className="count">{done.length}</span></div>
          <div className="col-body">
            {done.length === 0 && <div className="col-empty">— empty —</div>}
            {done.map((i) => (
              <div className="item done" key={i.id}>
                <Link to={`/comic/${i.volumeId}`} className="it-title">{i.title}</Link>
                <div className="it-series">{i.totalIssues ? `${i.totalIssues} issues · ` : ""}finished</div>
                <Stars value={i.rating} onSet={(n) => patch(i.id, { rating: n })} />
                <div className="row-actions">
                  <button className="mini-btn" onClick={() => patch(i.id, { status: "reading" })}>↩ Re-open</button>
                  <button className="mini-btn" onClick={() => remove(i.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Stars({ value, onSet }: { value: number; onSet: (n: number) => void }) {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          className={"star" + (n <= value ? " on" : "")}
          onClick={() => onSet(n === value ? 0 : n)}
          title={`${n}/5`}
        >
          ★
        </button>
      ))}
    </div>
  );
}