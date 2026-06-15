import { useState } from "react";
import { search } from "../api";
import type { ComicSummary } from "../types";
import Cover from "../components/Cover";
import { SkeletonGrid } from "../components/Skeletons";

export default function Search() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ComicSummary[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [error, setError] = useState("");

  async function runSearch() {
    const term = q.trim();
    if (!term) return;
    setStatus("loading");
    setError("");
    try {
      const r = await search(term);
      setResults(r);
      setStatus("done");
    } catch (e: any) {
      setError(e.message);
      setStatus("error");
    }
  }

  return (
    <section>
      <div className="page-head">
        <h1 className="page-title">
          <span className="kick">// Browse</span>Search
        </h1>
      </div>

      <div className="searchbar">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
          placeholder="Title, series, character… (e.g. Daredevil, Saga, Court of Owls)"
          autoFocus
        />
        <button className="go" onClick={runSearch}>Search</button>
      </div>
      <div className="hint">Searching ComicVine — covers, summaries &amp; issue counts are pulled live.</div>

      {status === "loading" && <SkeletonGrid />}
      {status === "error" && <div className="notice error">⚠ {error}</div>}
      {status === "done" && results.length === 0 && <div className="notice">No results. Try another title.</div>}

      {results.length > 0 && (
        <div className="grid">
          {results.map((c) => <Cover key={c.id} comic={c} />)}
        </div>
      )}

      {status === "idle" && (
        <div className="notice">Type a comic title above and hit Search — or roll the Random button for a complete story to discover.</div>
      )}
    </section>
  );
}