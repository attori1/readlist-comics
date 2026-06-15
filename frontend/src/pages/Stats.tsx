import { useEffect, useState } from "react";
import { getStats } from "../api";
import type { Stats } from "../types";

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getStats()
      .then((s) => { setStats(s); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return <div className="loading">Crunching your numbers…</div>;
  if (error) return <div className="notice error">⚠ {error}</div>;
  if (!stats) return null;

  const maxMonth = Math.max(1, ...stats.perMonth.map((m) => m.count));

  return (
    <section>
      <div className="page-head">
        <h1 className="page-title"><span className="kick">// Your habits</span>Stats</h1>
      </div>

      <div className="stat-blocks">
        <div className="stat-block">
          <div className="q">How fast are you catching up?</div>
          <div className="big">{stats.pacePerWeek} issues/week</div>
          <div className="sub">based on issues you read in the last two months</div>
        </div>
        <div className="stat-block">
          <div className="q">When will you finish your in-progress list?</div>
          <div className="big">{stats.projectedFinish ?? "—"}</div>
          <div className="sub">{stats.remaining} issues left at your current pace</div>
        </div>
      </div>

      <div className="page-head"><h2 className="page-title" style={{ fontSize: 22 }}>Issues per month</h2></div>
      {stats.perMonth.length === 0 ? (
        <div className="notice">No reading logged yet. Bump some counters in My List and come back.</div>
      ) : (
        <div className="bars">
          {stats.perMonth.map((m) => (
            <div className="bar-col" key={m.month}>
              <span className="bar-val">{m.count}</span>
              <div className="bar" style={{ height: `${(m.count / maxMonth) * 100}%` }} />
              <span className="bar-label">{m.month.slice(5)}/{m.month.slice(2, 4)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}