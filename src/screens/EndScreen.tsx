import { Confetti } from '../components/Confetti';
import { useEffect, useState } from 'react';
import type { Screen } from '../screenTypes';

// ─── End Screen ───────────────────────────────────────
export function EndScreen({ scores, names, coinsEarned, onRestart }: { scores: Record<string, number>; names: Record<string, string>; coinsEarned: number; onRestart: () => void }) {
  const [confetti, setConfetti] = useState(false);
  useEffect(() => { setTimeout(() => setConfetti(true), 200); }, []);
  const sorted = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);
  const isTie = sorted.length > 1 && scores[sorted[0]] === scores[sorted[1]];
  const MEDALS = ['🥇', '🥈', '🥉'];
  const winner = isTie ? null : sorted[0];

  return (
    <div className="screen" style={{ background: '#ffffff', backgroundImage: 'radial-gradient(circle, rgba(0,27,135,0.10) 1.5px, transparent 1.5px)', backgroundSize: '20px 20px', display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
      <Confetti active={confetti} />

      {/* LEFT — winner panel */}
      <div style={{
        width: '42%', background: '#001B87',
        clipPath: 'polygon(0% 0%, 100% 0%, 88% 100%, 0% 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 12, padding: '28px 36px 28px 28px',
        animation: 'slideRight .45s cubic-bezier(.22,1,.36,1) both',
      }}>
        <div style={{ fontSize: 56, lineHeight: 1, animation: 'popIn .5s .15s both' }}>{isTie ? '🤝' : '👑'}</div>
        <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 10, fontWeight: 800, color: 'rgba(48,231,237,.55)', letterSpacing: 4, textTransform: 'uppercase', marginTop: 4 }}>
          {isTie ? 'تعادل' : 'الفائز'}
        </div>
        <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 30, color: '#30E7ED', textAlign: 'center', lineHeight: 1.2, direction: 'rtl', animation: 'slideUp .4s .2s both' }}>
          {isTie
            ? sorted.filter(k => scores[k] === scores[sorted[0]]).map(k => names[k]).join(' و ')
            : names[sorted[0]]}
        </div>
        <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 48, color: '#ffffff', lineHeight: 1, animation: 'popIn .5s .3s both' }}>
          {scores[sorted[0]]}
        </div>
        <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 12, color: 'rgba(255,255,255,.35)', fontWeight: 700 }}>نقطة</div>

        <button onClick={onRestart} style={{
          marginTop: 12, background: '#30E7ED', color: '#001B87',
          fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 15,
          border: 'none', borderRadius: 10, padding: '12px 32px',
          boxShadow: '4px 4px 0 rgba(0,0,0,.25)',
          clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)',
          cursor: 'pointer', animation: 'slideUp .4s .35s both',
        }}>العب مجدداً ↺</button>
      </div>

      {/* RIGHT — standings */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '20px 28px 20px 20px', gap: 8, direction: 'rtl' }}>
        <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 11, fontWeight: 800, color: 'rgba(0,27,135,.4)', letterSpacing: 3, marginBottom: 4 }}>الترتيب النهائي</div>
        {sorted.map((k, i) => (
          <div key={k} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: i === 0 && !isTie ? '#001B87' : 'rgba(0,27,135,.06)',
            borderRadius: 8, padding: '10px 16px',
            border: i === 0 && !isTie ? 'none' : '1.5px solid rgba(0,27,135,.1)',
            animation: `slideLeft .35s cubic-bezier(.22,1,.36,1) ${i * 60}ms both`,
          }}>
            <div style={{ fontSize: 20, flexShrink: 0 }}>{MEDALS[i] || '🏅'}</div>
            <div style={{
              flex: 1, fontFamily: "'Tajawal',sans-serif", fontWeight: 800, fontSize: 15,
              color: i === 0 && !isTie ? '#30E7ED' : '#001B87',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{names[k]}</div>
            <div style={{
              fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 22,
              color: i === 0 && !isTie ? '#ffffff' : 'rgba(0,27,135,.5)',
            }}>{scores[k]}</div>
          </div>
        ))}

        {/* Coins earned badge */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 10, background: 'rgba(48,231,237,.10)',
          border: '1.5px solid rgba(48,231,237,.3)',
          borderRadius: 10, padding: '10px 14px',
          animation: 'slideLeft .4s cubic-bezier(.22,1,.36,1) 250ms both',
        }}>
          <span style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 700, fontSize: 13, color: 'rgba(0,27,135,.65)' }}>مكافأة المباراة</span>
          <span style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 18, color: '#001B87', display: 'flex', alignItems: 'center', gap: 5 }}>
            +{coinsEarned.toLocaleString()} <span style={{ fontSize: 16 }}>🪙</span>
          </span>
        </div>
      </div>
    </div>
  );
}

