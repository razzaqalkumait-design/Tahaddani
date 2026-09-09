import { SettingsBtn, SettingsOverlay } from '../components/SettingsOverlay';
import { AccountCtx } from '../contexts/AccountContext';
import { CoinsCtx } from '../contexts/CoinsContext';
import { NavCtx } from '../contexts/NavContext';
import coinIconWhite from '../assets/COIN_WHITE__1_.png';
import { fetchSoloQuestions } from '../api';
import { useContext, useEffect, useRef, useState } from 'react';
import type { SoloQ } from '../api';
import type { Question } from '../types';

// ─── Solo Game ────────────────────────────────────────
// SoloQ type comes from api.ts import at top of file

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickFromPool(pool: SoloQ[], streak: number, used: Set<string>): SoloQ | null {
  const tier = Math.min(5, Math.floor(streak / 5) + 1);
  let candidates = pool.filter(q => q.tier === tier && !used.has(q.question));
  if (!candidates.length) candidates = pool.filter(q => q.tier === tier);
  if (!candidates.length) candidates = pool.filter(q => !used.has(q.question));
  if (!candidates.length) candidates = pool;
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export const SOLO_TIMER = 15;

export const SOLO_DOT_BG = { background: '#ffffff', backgroundImage: 'radial-gradient(circle, rgba(0,27,135,0.10) 1.5px, transparent 1.5px)', backgroundSize: '20px 20px' } as const;

export function SoloGame({ onBack }: { onBack: () => void }) {
  const { account: soloAccount } = useContext(AccountCtx);
  const { goHome } = useContext(NavCtx);
  const { addCoins } = useContext(CoinsCtx);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [phase, setPhase] = useState<'setup' | 'loading' | 'playing' | 'wrong' | 'end'>('setup');
  const [playerName, setPlayerName] = useState(() => soloAccount?.name ?? '');
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [q, setQ] = useState<SoloQ | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(SOLO_TIMER);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const usedQs = useRef<Set<string>>(new Set());
  const soloPool = useRef<SoloQ[]>([]);

  const loadQ = (newStreak: number) => {
    const next = pickFromPool(soloPool.current, newStreak, usedQs.current);
    if (!next) return;
    usedQs.current.add(next.question);
    const c = shuffle([...next.wrong, next.answer]);
    setQ(next);
    setChoices(c);
    setSelected(null);
    setTimeLeft(SOLO_TIMER);
  };

  useEffect(() => {
    if (phase !== 'playing' || selected !== null) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setPhase('wrong');
          setBest(b => Math.max(b, streak));
          if (streak > 0) addCoins(streak * 2);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [phase, selected, q]);

  const startSolo = async () => {
    setPhase('loading');
    try {
      const questions = await fetchSoloQuestions(null, 200);
      soloPool.current = questions;
      usedQs.current.clear();
      loadQ(0);
      setStreak(0);
      setPhase('playing');
    } catch {
      setPhase('setup');
    }
  };

  const answer = (choice: string) => {
    if (selected || phase !== 'playing' || !q) return;
    clearInterval(timerRef.current!);
    setSelected(choice);
    if (choice === q.answer) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setBest(b => Math.max(b, newStreak));
      setTimeout(() => loadQ(newStreak), 700);
    } else {
      setPhase('wrong');
      setBest(b => Math.max(b, streak));
      if (streak > 0) addCoins(streak * 2);
    }
  };

  const restart = () => {
    usedQs.current.clear();
    setStreak(0); setSelected(null); setPhase('playing'); setTimeLeft(SOLO_TIMER);
    loadQ(0);
  };

  const tier = Math.min(5, Math.floor(streak / 5) + 1);
  const tierColor = ['#30E7ED','#38E27D','#FFD700','#FF9A3C','#FF3D68'][tier - 1];

  if (phase === 'loading') return (
    <div className="screen" style={{ ...SOLO_DOT_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 44, height: 44, border: '4px solid rgba(0,27,135,.15)', borderTop: '4px solid #001B87', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
      <div style={{ fontFamily: "'Tajawal',sans-serif", color: 'rgba(0,27,135,.5)', fontSize: 14 }}>جارٍ تحميل الأسئلة...</div>
    </div>
  );

  if (phase === 'setup') {
    const canStart = playerName.trim().length > 0;
    return (
      <div className="screen" style={{ ...SOLO_DOT_BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, direction: 'rtl', animation: 'fadeIn .3s ease both' }}>
        <div style={{ background: '#001B87', borderRadius: 16, padding: '32px 36px', width: 320, display: 'flex', flexDirection: 'column', gap: 20, clipPath: 'polygon(0% 0%, 100% 2%, 98% 100%, 0% 100%)', boxShadow: '6px 6px 0 #30E7ED', animation: 'scaleIn .3s cubic-bezier(.22,1,.36,1) both' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 22, color: '#30E7ED' }}>🎯 وضع سولو</div>
            <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 13, color: 'rgba(255,255,255,.45)' }}>أجب على أكبر عدد ممكن بدون خطأ</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.6)' }}>اسمك</label>
            <input
              className="ta-input"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canStart) startSolo(); }}
              placeholder="أدخل اسمك..."
              maxLength={20}
              style={{ fontSize: 15, padding: '10px 14px', borderRadius: 8 }}
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { if (canStart) startSolo(); }} disabled={!canStart} style={{ flex: 2, fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 16, background: canStart ? '#30E7ED' : 'rgba(48,231,237,.25)', color: '#001B87', border: 'none', borderRadius: 10, padding: '13px 0', cursor: canStart ? 'pointer' : 'not-allowed', boxShadow: canStart ? '4px 4px 0 rgba(0,0,0,.25)' : 'none', clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)', transition: 'all .2s' }}>ابدأ ←</button>
            <button onClick={onBack} style={{ flex: 1, fontFamily: "'Tajawal',sans-serif", fontWeight: 700, fontSize: 14, background: 'transparent', color: 'rgba(255,255,255,.45)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 10, padding: '13px 0', cursor: 'pointer' }}>رجوع</button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'wrong' || phase === 'end') {
    const earned = streak * 2;
    return (
      <div className="screen" style={{ ...SOLO_DOT_BG, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, direction: 'rtl', padding: '20px 24px' }}>
        {/* Result card */}
        {/* Left: streak + stats */}
        <div style={{ background: '#001B87', borderRadius: 12, padding: '16px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, clipPath: 'polygon(0% 0%, 100% 3%, 97% 100%, 0% 100%)', boxShadow: '4px 4px 0 rgba(0,0,0,.2)', animation: 'scaleIn .3s ease both', minWidth: 160 }}>
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 52, color: '#30E7ED', lineHeight: 1 }}>{streak}</div>
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 11, color: 'rgba(255,255,255,.5)' }}>متتالية</div>
          <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 18, color: '#FFD700' }}>{best}</div>
              <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 10, color: 'rgba(255,255,255,.4)' }}>الأفضل</div>
            </div>
            {earned > 0 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 18, color: '#FFD700' }}>+{earned}</span>
                  <img src={coinIconWhite} alt="" style={{ width: 14, height: 14, objectFit: 'contain' }} />
                </div>
                <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 10, color: 'rgba(255,255,255,.4)' }}>عملات</div>
              </div>
            )}
          </div>
        </div>

        {/* Right: title + answer + buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 20, color: selected === null ? '#FF9A3C' : '#FF3D68' }}>
            {selected === null ? '⏰ انتهى الوقت!' : '💥 إجابة خاطئة!'}
          </div>
          <div style={{ background: 'rgba(56,226,125,.12)', border: '1.5px solid #38E27D', borderRadius: 8, padding: '8px 14px' }}>
            <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 11, color: 'rgba(0,27,135,.5)' }}>الإجابة الصحيحة</div>
            <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 16, color: '#1a6b3c' }}>{q?.answer}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={restart} style={{ flex: 2, fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 14, background: '#001B87', color: '#30E7ED', border: 'none', borderRadius: 8, padding: '10px', cursor: 'pointer', boxShadow: '3px 3px 0 rgba(0,0,0,.2)' }}>مرة ثانية ↺</button>
            <button onClick={onBack} style={{ flex: 1, fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 14, background: 'rgba(0,27,135,.4)', color: 'rgba(255,255,255,.7)', border: 'none', borderRadius: 8, padding: '10px', cursor: 'pointer' }}>رئيسية</button>
          </div>
        </div>
      </div>
    );
  }

  if (!q) return null;

  return (
    <div className="screen" style={{ ...SOLO_DOT_BG, display: 'flex', flexDirection: 'column', direction: 'rtl' }}>
      {settingsOpen && <SettingsOverlay onClose={() => setSettingsOpen(false)} onExit={goHome} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#001B87', borderBottom: '2px solid rgba(255,255,255,.07)', flexShrink: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 32, color: '#30E7ED', lineHeight: 1 }}>{streak}</div>
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 10, color: 'rgba(255,255,255,.45)' }}>متتالية</div>
          {playerName ? <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.6)', marginTop: 2 }}>{playerName}</div> : null}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 700, fontSize: 11, color: tierColor, padding: '2px 10px', background: `${tierColor}22`, borderRadius: 4 }}>مستوى {tier}</div>
          <div style={{ position: 'relative', width: 44, height: 44 }}>
            <svg width="44" height="44" viewBox="0 0 48 48" className="timer-ring" style={{ position: 'absolute', inset: 0 }}>
              <circle cx="24" cy="24" r="20" className="timer-track" strokeWidth="4" />
              <circle cx="24" cy="24" r="20" className={`timer-fill ${timeLeft <= 5 ? 'urgent' : 'ok'}`} strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 20}`}
                strokeDashoffset={`${2 * Math.PI * 20 * (1 - timeLeft / SOLO_TIMER)}`} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 13, color: timeLeft <= 5 ? '#FF3D68' : '#ffffff' }}>{timeLeft}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 32, color: '#FFD700', lineHeight: 1 }}>{best}</div>
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 10, color: 'rgba(255,255,255,.45)' }}>الأفضل</div>
        </div>
      </div>

      {/* Question */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div key={q.question} style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 22, color: '#001B87', textAlign: 'center', lineHeight: 1.5, animation: 'scaleIn .3s ease both' }}>
          {q.question}
        </div>
      </div>

      {/* Answer choices */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 16px 20px' }}>
        {choices.map((c, i) => {
          const isCorrect = c === q.answer;
          const isSelected = c === selected;
          const revealed = selected !== null;
          let bg = '#001B87';
          let border = '2px solid transparent';
          let txtColor = '#ffffff';
          if (revealed && isCorrect) { bg = 'rgba(56,226,125,.15)'; border = '2px solid #38E27D'; txtColor = '#1a6b3c'; }
          else if (revealed && isSelected && !isCorrect) { bg = 'rgba(255,61,104,.12)'; border = '2px solid #FF3D68'; txtColor = '#c0002a'; }
          return (
            <button key={i} onClick={() => answer(c)} style={{
              fontFamily: "'Tajawal',sans-serif", fontWeight: 700, fontSize: 16,
              background: bg, border, borderRadius: 10, color: txtColor,
              padding: '16px 12px', cursor: selected ? 'default' : 'pointer',
              textAlign: 'center', direction: 'rtl', lineHeight: 1.3,
              transition: 'background .2s, border .2s, color .2s',
              animation: `slideUp .3s ${i * 60}ms ease both`,
            }}>{c}</button>
          );
        })}
      </div>

      <SettingsBtn onClick={() => setSettingsOpen(true)} />
    </div>
  );
}

export const TA_GAME_STREAK_KEY = 'ta_game_streak';
export const getGameStreak = () => Number(localStorage.getItem(TA_GAME_STREAK_KEY) || 0);
export const setGameStreak = (n: number) => localStorage.setItem(TA_GAME_STREAK_KEY, String(n));

