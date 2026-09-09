import { CONFETTI_COLORS } from '../screenTypes';
import { useEffect, useState } from 'react';

// ─── Confetti ─────────────────────────────────────────
export function Confetti({ active }: { active: boolean }) {
  const [pieces, setPieces] = useState<{ id: number; x: number; color: string; size: number; dur: number; delay: number }[]>([]);
  useEffect(() => {
    if (!active) { setPieces([]); return; }
    setPieces(Array.from({ length: 70 }, (_, i) => ({
      id: i, x: Math.random() * 100,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 7 + Math.random() * 8,
      dur: 2.2 + Math.random() * 2.2,
      delay: Math.random() * 1.8,
    })));
  }, [active]);
  return <>
    {pieces.map(p => (
      <div key={p.id} className="confetti-piece" style={{
        left: `${p.x}%`, width: p.size, height: p.size * .45,
        background: p.color, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`,
      }} />
    ))}
  </>;
}

