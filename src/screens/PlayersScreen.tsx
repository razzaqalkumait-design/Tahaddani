import { BackBtn } from '../components/BackBtn';
import { useState } from 'react';
import type { GameMode } from '../types';

// ─── Player Setup ─────────────────────────────────────
export function PlayersScreen({ mode, onConfirm, onBack }: { mode: GameMode; onConfirm: (p: string[]) => void; onBack: () => void }) {
  const isFFA = mode === 'ffa' || mode === 'wickedFfa';
  const [names, setNames] = useState(['', '']);
  const [randMode, setRandMode] = useState(false);
  const [randNames, setRandNames] = useState<string[]>(['', '']);
  const [splitResult, setSplitResult] = useState<[string[], string[]] | null>(null);

  const update = (i: number, v: string) => setNames(n => n.map((x, idx) => idx === i ? v : x));
  const add = () => { if (names.length < 8) setNames(n => [...n, '']); };
  const remove = (i: number) => { if (names.length > 2) setNames(n => n.filter((_, idx) => idx !== i)); };
  const confirm = () => {
    const valid = names.map(n => n.trim()).filter(Boolean);
    if (valid.length < 2) return;
    onConfirm(valid);
  };

  const randUpdate = (i: number, v: string) => setRandNames(n => n.map((x, idx) => idx === i ? v : x));
  const randAdd = () => { if (randNames.length < 20) setRandNames(n => [...n, '']); };
  const randRemove = (i: number) => { if (randNames.length > 2) setRandNames(n => n.filter((_, idx) => idx !== i)); };
  const randomize = () => {
    const valid = randNames.map(n => n.trim()).filter(Boolean);
    if (valid.length < 2) return;
    const shuffled = [...valid].sort(() => Math.random() - 0.5);
    const half = Math.ceil(shuffled.length / 2);
    setSplitResult([shuffled.slice(0, half), shuffled.slice(half)]);
  };
  const confirmRand = () => {
    if (!splitResult) return;
    onConfirm([splitResult[0].join(' / '), splitResult[1].join(' / ')]);
  };

  const ready = names.map(n => n.trim()).filter(Boolean).length >= 2;
  const randReady = randNames.map(n => n.trim()).filter(Boolean).length >= 2;

  const teamClips = [
    'polygon(0% 0%, 100% 3%, 97% 100%, 0% 100%)',
    'polygon(3% 0%, 100% 0%, 100% 97%, 0% 100%)',
  ];

  return (
    <div className="screen" style={{ background: '#ffffff', backgroundImage: 'radial-gradient(circle, rgba(0,27,135,0.10) 1.5px, transparent 1.5px)', backgroundSize: '20px 20px', display: 'flex', flexDirection: 'column', padding: '14px 12px', gap: 12, animation: 'fadeIn .3s ease both' }}>
      {/* Top */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <BackBtn onBack={onBack} />
        <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 22, color: '#001B87', direction: 'rtl' }}>
          {isFFA ? '👥 أسماء اللاعبين' : '🆚 أسماء الفريقين'}
        </div>
        {!isFFA && (
          <button onClick={() => { setRandMode(r => !r); setSplitResult(null); }} style={{
            marginRight: 'auto', background: randMode ? '#001B87' : 'rgba(0,27,135,.08)',
            color: randMode ? '#30E7ED' : '#001B87', border: randMode ? '2px solid #30E7ED' : '2px dashed rgba(0,27,135,.25)',
            borderRadius: 10, padding: '7px 16px', cursor: 'pointer',
            fontFamily: "'Tajawal',sans-serif", fontWeight: 800, fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: randMode ? '3px 3px 0 #30E7ED' : 'none', transition: 'all .2s',
          }}>
            <span>🎲</span> عشوائي
          </button>
        )}
      </div>

      {/* Randomizer UI */}
      {randMode && !isFFA && (
        <div style={{ flex: 1, display: 'flex', gap: 14, minHeight: 0, overflow: 'hidden' }}>
          {/* Left — name inputs */}
          <div style={{ flex: '0 0 42%', background: '#001B87', borderRadius: 10, padding: '16px 14px', clipPath: 'polygon(0% 0%, 100% 2%, 98% 100%, 0% 100%)', boxShadow: '4px 4px 0 #30E7ED', display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', direction: 'rtl' }}>
            <div style={{ color: '#30E7ED', fontWeight: 800, fontSize: 13, marginBottom: 2 }}>أسماء اللاعبين ({randNames.filter(n => n.trim()).length}/20)</div>
            {randNames.map((n, i) => (
              <div key={i} style={{ display: 'flex', gap: 6 }}>
                <input value={n} onChange={e => randUpdate(i, e.target.value)}
                  placeholder={`اللاعب ${i + 1}`}
                  style={{ flex: 1, background: 'rgba(255,255,255,.1)', border: '1.5px solid rgba(48,231,237,.3)', borderRadius: 7, padding: '8px 12px', color: '#fff', fontSize: 14, fontWeight: 700, outline: 'none', direction: 'rtl' }} />
                {randNames.length > 2 && (
                  <button onClick={() => randRemove(i)} style={{ background: 'rgba(255,61,104,.3)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: '6px 10px', fontSize: 12 }}>✕</button>
                )}
              </div>
            ))}
            {randNames.length < 20 && (
              <button onClick={randAdd} style={{ background: 'transparent', border: '1.5px dashed rgba(48,231,237,.4)', borderRadius: 7, color: '#30E7ED', cursor: 'pointer', padding: '8px', fontFamily: "'Tajawal',sans-serif", fontWeight: 700, fontSize: 13 }}>+ لاعب</button>
            )}
          </div>

          {/* Right — split result */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!splitResult ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button onClick={randomize} disabled={!randReady} style={{
                  background: randReady ? '#30E7ED' : 'rgba(48,231,237,.25)', color: '#001B87',
                  border: 'none', borderRadius: 12, padding: '18px 36px',
                  fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 18,
                  boxShadow: randReady ? '5px 5px 0 #001B87' : 'none',
                  clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)',
                  cursor: randReady ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: 22 }}>🎲</span> وزّع الفرق
                </button>
              </div>
            ) : (
              <>
                {[0, 1].map(ti => (
                  <div key={ti} style={{ flex: 1, background: ti === 0 ? '#30E7ED' : '#001B87', borderRadius: 10, padding: '12px 16px', clipPath: ti === 0 ? 'polygon(0% 0%, 100% 2%, 98% 100%, 0% 100%)' : 'polygon(2% 0%, 100% 0%, 100% 98%, 0% 100%)', boxShadow: '4px 4px 0 rgba(0,0,0,.2)', animation: 'popIn .35s ease both', overflowY: 'auto', direction: 'rtl' }}>
                    <div style={{ color: ti === 0 ? '#001B87' : '#30E7ED', fontWeight: 900, fontSize: 13, marginBottom: 8 }}>● الفريق {ti === 0 ? 'الأول' : 'الثاني'}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {splitResult[ti].map((name, i) => (
                        <span key={i} style={{ background: ti === 0 ? 'rgba(0,27,135,.15)' : 'rgba(48,231,237,.15)', color: ti === 0 ? '#001B87' : '#fff', borderRadius: 6, padding: '4px 10px', fontWeight: 700, fontSize: 13 }}>{name}</span>
                      ))}
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={randomize} style={{ flex: 1, background: 'rgba(0,27,135,.08)', color: '#001B87', border: '1.5px dashed rgba(0,27,135,.25)', borderRadius: 8, padding: '10px', fontFamily: "'Tajawal',sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>🔀 إعادة التوزيع</button>
                  <button onClick={confirmRand} style={{ flex: 2, background: '#001B87', color: '#30E7ED', border: 'none', borderRadius: 8, padding: '10px', fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 14, cursor: 'pointer', boxShadow: '3px 3px 0 #30E7ED', clipPath: 'polygon(3% 0%, 100% 0%, 97% 100%, 0% 100%)' }}>تأكيد الفرق ▶</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {(!randMode || isFFA) && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 0 }}>
        {isFFA ? (
          <div style={{
            background: '#001B87', borderRadius: 10, padding: '28px',
            width: 440, clipPath: 'polygon(0% 0%, 100% 2%, 98% 100%, 0% 100%)',
            boxShadow: '5px 5px 0 rgba(0,0,0,.25)',
          }}>
            <div style={{ direction: 'rtl', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {names.map((n, i) => (
                <div key={i} style={{ display: 'flex', gap: 8 }}>
                  <input className="ta-input" style={{ flex: 1, padding: '12px 16px' }}
                    placeholder={`اللاعب ${i + 1}`} value={n}
                    onChange={e => update(i, e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && confirm()} />
                  {names.length > 2 && (
                    <button onClick={() => remove(i)} style={{
                      padding: '8px 14px', borderRadius: 6, border: 'none',
                      background: 'var(--danger)', color: '#fff', cursor: 'pointer', fontWeight: 700,
                    }}>✕</button>
                  )}
                </div>
              ))}
              {names.length < 6 && (
                <button onClick={add} style={{
                  marginTop: 6, width: '100%', padding: '11px', borderRadius: 6, border: '2px solid #30E7ED',
                  background: 'transparent', color: '#30E7ED', cursor: 'pointer',
                  fontFamily: "'Tajawal',sans-serif", fontWeight: 700, fontSize: 14,
                }}>+ لاعب</button>
              )}
            </div>
          </div>
        ) : (
          <>
            {[0, 1].map(ti => (
              <div key={ti} style={{
                flex: 1, maxWidth: 360,
                background: ti === 0 ? '#30E7ED' : '#001B87',
                borderRadius: 10, padding: '28px 24px',
                clipPath: teamClips[ti],
                boxShadow: '5px 5px 0 rgba(0,0,0,.25)',
                animation: `slideUp .35s ease ${ti * .1}s both`,
              }}>
                <div style={{
                  direction: 'rtl', fontFamily: "'Tajawal',sans-serif", fontWeight: 900,
                  fontSize: 18, marginBottom: 16,
                  color: ti === 0 ? '#001B87' : '#30E7ED',
                }}>
                  {ti === 0 ? '● الفريق الأول' : '● الفريق الثاني'}
                </div>
                <input className="ta-input" style={{ width: '100%', padding: '14px 16px', fontSize: 16 }}
                  placeholder="اسم الفريق أو اللاعب"
                  value={names[ti] || ''} onChange={e => update(ti, e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && confirm()} />
              </div>
            ))}
          </>
        )}
      </div>}

      {/* Play Now slides in when ready — hidden in rand mode (confirmRand handles it) */}
      <div style={{
        position: 'fixed', bottom: 28, right: 24,
        transform: ready && !randMode ? 'translateX(0)' : 'translateX(120%)',
        transition: 'transform .35s cubic-bezier(.22,1,.36,1)',
        zIndex: 50,
      }}>
        <button onClick={confirm} style={{
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

