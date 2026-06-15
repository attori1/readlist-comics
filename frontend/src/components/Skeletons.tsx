export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <div className="sk sk-cover" />
          <div className="sk sk-line" />
          <div className="sk sk-line short" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDetail() {
  return (
    <div className="detail">
      <div className="big-cover">
        <div className="sk" style={{ aspectRatio: "2 / 3", boxShadow: "10px 10px 0 var(--shadow)" }} />
      </div>
      <div>
        <div className="sk sk-line" style={{ height: 48, width: "70%" }} />
        <div className="sk sk-line" style={{ width: "40%" }} />
        <div className="sk sk-line" style={{ marginTop: 24, height: 120 }} />
      </div>
    </div>
  );
}