import { BackBtn } from '../components/BackBtn';
import { CatImage } from '../components/CatImage';
import { pickRandomGroups, playableGroups } from '../data';
import { useState } from 'react';
import type { GameMode } from '../types';

// ─── Category Select ─────────────────────────────────
export function CategoriesScreen({ mode, players, onConfirm, onBack }: {
  mode: GameMode; players: string[]; onConfirm: (g: string[]) => void; onBack: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const MAX = 8, MIN = 2;

  const toggle = (g: string) => setSelected(s =>
    s.includes(g) ? s.filter(x => x !== g) : s.length < MAX ? [...s, g] : s
  );

  const ready = selected.length >= MIN;

  return (
    <div className="screen" style={{ background: '#ffffff', backgroundImage: 'radial-gradient(circle, rgba(0,27,135,0.10) 1.5px, transparent 1.5px)', backgroundSize: '20px 20px', display: 'flex', flexDirection: 'column', padding: '12px 12px 0', gap: 10, animation: 'fadeIn .3s ease both', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, flexWrap: 'wrap' }}>
        <BackBtn onBack={onBack} />
        <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 20, color: '#001B87', direction: 'rtl' }}>
          اختر الفئات
        </div>
        {/* Counter badge */}
        <div style={{
          fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 13,
          background: ready ? '#30E7ED' : 'rgba(0,27,135,.10)',
          color: ready ? '#001B87' : 'rgba(0,27,135,.45)',
          padding: '5px 14px', borderRadius: 4,
          transition: 'all .2s ease',
          boxShadow: ready ? '3px 3px 0 #001B87' : 'none',
        }}>{selected.length} / {MAX}</div>
        <button onClick={() => setSelected(pickRandomGroups(6))} style={{
          marginLeft: 'auto', fontFamily: "'Tajawal',sans-serif", fontWeight: 700, fontSize: 13,
          background: '#001B87', color: '#30E7ED', border: 'none', borderRadius: 6,
          padding: '9px 18px', cursor: 'pointer', boxShadow: '3px 3px 0 rgba(0,0,0,.25)',
        }}>🎲 عشوائي</button>
      </div>

      {/* Vertical scrolling square grid */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gridAutoRows: '140px', gap: 16, alignContent: 'start', padding: '4px 4px 90px' }}>
        {playableGroups.map((g, i) => {
          const sel = selected.includes(g);
          return (
            <div key={g} onClick={() => toggle(g)} style={{
              aspectRatio: '1 / 1', borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
              position: 'relative', border: sel ? '3px solid #30E7ED' : '3px solid transparent',
              boxShadow: sel ? '4px 4px 0 #001B87' : '2px 2px 0 rgba(0,27,135,.12)',
              background: '#e8eeff', transition: 'border-color .15s, box-shadow .15s, transform .15s',
              transform: sel ? 'scale(1.04)' : 'none',
              animation: `fadeIn .2s ease ${i * 0.018}s both`,
            }}>
              <CatImage group={g} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              {sel && (
                <div style={{ position: 'absolute', top: 5, right: 5, width: 18, height: 18, borderRadius: '50%', background: '#30E7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#001B87', boxShadow: '2px 2px 0 #001B87' }}>✓</div>
              )}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,27,135,.85))', padding: '18px 6px 5px', textAlign: 'center', direction: 'rtl' }}>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 10, lineHeight: 1.3 }}>{g}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Play Now slides in when enough categories selected */}
      <div style={{
        position: 'fixed', bottom: 28, right: 24,
        transform: ready ? 'translateX(0)' : 'translateX(120%)',
        transition: 'transform .35s cubic-bezier(.22,1,.36,1)',
        zIndex: 50,
      }}>
        <button onClick={() => onConfirm(selected)} style={{
          background: '#30E7ED', color: '#001B87', fontWeight: 900, fontSize: 18,
          border: 'none', borderRadius: 14, padding: '18px 36px',
          boxShadow: '6px 6px 0 #001B87', cursor: 'pointer',
          clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span>العب الآن</span>
          <span style={{ fontSize: 22 }}>▶</span>
        </button>
      </div>
    </div>
  );
}

