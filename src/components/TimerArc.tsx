// ─── Timer ────────────────────────────────────────────
export function TimerArc({ t, total }: { t: number; total: number }) {
  const r = 28, c = 2 * Math.PI * r;
  const pct = Math.max(0, t / total);
  return (
    <div style={{ position: 'relative', width: 72, height: 72 }}>
      <svg width="72" height="72" className="timer-ring">
        <circle className="timer-track" cx="36" cy="36" r={r} strokeWidth="5" />
        <circle className={`timer-fill ${t <= 10 ? 'urgent' : 'ok'}`}
          cx="36" cy="36" r={r} strokeWidth="5"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Tajawal',sans-serif", fontSize: 22, fontWeight: 900,
        color: t <= 10 ? 'var(--danger)' : '#001B87',
      }}>{t}</div>
    </div>
  );
}

