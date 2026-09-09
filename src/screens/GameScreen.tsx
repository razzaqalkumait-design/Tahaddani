import { SettingsBtn, SettingsOverlay } from '../components/SettingsOverlay';
import { TimerArc } from '../components/TimerArc';
import { NavCtx } from '../contexts/NavContext';
import { TIERS } from '../screenTypes';
import { loadQuestionsForGame, pickQuestion, pickSuddenDeathQuestion } from '../data';
import { useContext, useEffect, useRef, useState } from 'react';
import type { Screen } from '../screenTypes';
import type { GameMode, Question } from '../types';

// ─── Game Screen ──────────────────────────────────────
export function GameScreen({ mode, players, groups, onEnd, onBack }: {
  mode: GameMode; players: string[]; groups: string[];
  onEnd: (sc: Record<string, number>, nm: Record<string, string>) => void;
  onBack: () => void;
}) {
  const [questionsReady, setQuestionsReady] = useState(false);
  useEffect(() => {
    loadQuestionsForGame(groups).then(() => setQuestionsReady(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isFFA = mode === 'ffa' || mode === 'wickedFfa';
  const isWicked = mode.includes('wicked');
  const isHost = mode.includes('Host');

  const initScores = () => { const s: Record<string, number> = {}; if (isFFA) players.forEach((_, i) => { s[i] = 0; }); else { s[1] = 0; s[2] = 0; } return s; };
  const initNames  = () => { const n: Record<string, string> = {}; if (isFFA) players.forEach((p, i) => { n[i] = p; }); else { n[1] = players[0] || 'الفريق 1'; n[2] = players[1] || 'الفريق 2'; } return n; };

  const TIMER_SECS = 60;
  const [scores, setScores] = useState(initScores);
  const [names]  = useState(initNames);
  const [currentTeam, setCurrentTeam] = useState<string>(isFFA ? '0' : '1');
  const [usedCells, setUsedCells] = useState<Set<string>>(new Set());
  const [usedQTexts, setUsedQTexts] = useState<Set<string>>(new Set());
  const [cellWinners, setCellWinners] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState<Question | null>(null);
  // Sudden death
  const [sdPhase, setSdPhase] = useState<'none' | 'question' | 'reveal'>('none');
  const [sdQ, setSdQ] = useState<Question | null>(null);
  const [sdCount, setSdCount] = useState(0); // questions shown so far
  const [sdAnsTeam, setSdAnsTeam] = useState<string | null>(null);
  const [ansTeam, setAnsTeam] = useState<string>(isFFA ? '0' : '1');
  const [showAnswer, setShowAnswer] = useState(true);
  const [skipped, setSkipped] = useState(false);
  const [showReveal, setShowReveal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECS);
  const [shuffledGroups] = useState(() => { const a = [...groups]; for (let i = a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { goHome } = useContext(NavCtx);

  // Game actions
  const [gaUsed, setGaUsed] = useState({ block: {} as Record<string,boolean>, two: {} as Record<string,boolean>, steal: {} as Record<string,boolean>, double: {} as Record<string,boolean> });
  // doubleTeam: which team activated double for this question
  const [gaState, setGaState] = useState({ block: false, two: false, steal: false, double: false, doubleTeam: '' as string });
  const [doubleArmed, setDoubleArmed] = useState(false);

  const stopTimer = () => { if (timerRef.current) clearInterval(timerRef.current); };
  const startTimer = (secs: number) => {
    stopTimer();
    setTimeLeft(secs);
    timerRef.current = setInterval(() => setTimeLeft(t => { if (t <= 1) { stopTimer(); return 0; } return t - 1; }), 1000);
  };
  useEffect(() => () => stopTimer(), []);
  // Timer expiry
  useEffect(() => {
    if (timeLeft === 0 && sdPhase === 'question') { stopTimer(); setSdPhase('reveal'); return; }
    if (timeLeft === 0 && currentQ) {
      if (isFFA || skipped || gaState.block) { stopTimer(); setShowReveal(true); }
      else skip();
    }
  }, [timeLeft]);

  const selectQuestion = (g: string, pts: number) => {
    const key = `${g}|${pts}`;
    if (usedCells.has(key)) return;
    const q = pickQuestion(g, pts);
    if (!q) return;
    setUsedQTexts(s => new Set([...s, q.question]));
    setCurrentQ(q);
    setAnsTeam(currentTeam);
    setShowAnswer(false);
    setSkipped(false);
    setShowReveal(false);
    setGaState({ block: false, two: false, steal: false, double: doubleArmed, doubleTeam: doubleArmed ? currentTeam : '' });
    if (doubleArmed) { setGaUsed(u => ({ ...u, double: { ...u.double, [currentTeam]: true } })); setDoubleArmed(false); }
    startTimer(TIMER_SECS);
  };

  const triggerSuddenDeath = (currentScores: Record<string, number>, currentUsedTexts: Set<string>) => {
    const q = pickSuddenDeathQuestion(currentUsedTexts);
    if (!q) { onEnd(currentScores, names); return; }
    setSdQ(q);
    setSdAnsTeam(null);
    setSdPhase('question');
    setUsedQTexts(s => new Set([...s, q.question]));
    startTimer(TIMER_SECS);
  };

  const closeQuestion = (winnerTeam?: string) => {
    if (!currentQ) return;
    const key = `${currentQ.group}|${currentQ.points}`;
    const newUsedCells = new Set([...usedCells, key]);
    const newUsedTexts = new Set([...usedQTexts, currentQ.question]);
    setUsedCells(newUsedCells);
    setUsedQTexts(newUsedTexts);
    setCellWinners(w => ({ ...w, [key]: winnerTeam ?? '' }));
    setCurrentQ(null); setShowAnswer(false); stopTimer(); setSkipped(false); setShowReveal(false);
    setGaState({ block: false, two: false, steal: false, double: false, doubleTeam: '' });
    if (isFFA) setCurrentTeam(t => String((Number(t) + 1) % players.length));
    else setCurrentTeam(t => t === '1' ? '2' : '1');
    const total = shuffledGroups.length * TIERS.length;
    if (newUsedCells.size >= total) {
      const newScores = winnerTeam ? { ...scores, [winnerTeam]: (scores[winnerTeam] || 0) } : scores;
      // check tie (only for 2-team non-FFA)
      const keys = isFFA ? players.map((_, i) => String(i)) : ['1', '2'];
      const topScore = Math.max(...keys.map(k => newScores[k] || 0));
      const tied = keys.filter(k => (newScores[k] || 0) === topScore);
      if (!isFFA && tied.length > 1) {
        setTimeout(() => { setSdCount(0); triggerSuddenDeath(newScores, newUsedTexts); }, 400);
      } else {
        setTimeout(() => onEnd(newScores, names), 400);
      }
      return;
    }
  };

  // Wicked events
  type WickedEvent = 'double' | 'deduct' | 'transfer' | 'noPoints' | 'keepTurn' | 'gotYouuu';
  const HIGH_VALUE_TIERS = [300, 400, 500];
  const WICKED_CORRECT: WickedEvent[] = ['double', 'deduct', 'transfer', 'noPoints', 'keepTurn'];

  // Pre-shuffled trigger decks: exactly 2 `true`s among all high-value question slots per team
  const [wickedDecks] = useState<Record<string, boolean[]>>(() => {
    if (!isWicked) return {};
    const hvCount = shuffledGroups.length * HIGH_VALUE_TIERS.length;
    const deck = (n: number) => {
      const arr = Array(n).fill(false); arr[0] = true; arr[1] = true;
      for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
      return arr;
    };
    const keys = isFFA ? players.map((_, i) => String(i)) : ['1', '2'];
    return Object.fromEntries(keys.map(k => [k, deck(Math.max(hvCount, 3))]));
  });
  const [wickedDeckIdx, setWickedDeckIdx] = useState<Record<string, number>>({});
  const [wickedUsedEvents, setWickedUsedEvents] = useState<Record<string, WickedEvent[]>>({});
  const [lastEvent, setLastEvent] = useState<WickedEvent | null>(null);
  const [activeWickedEvent, setActiveWickedEvent] = useState<{ event: WickedEvent; team: string } | null>(null);

  const rollWickedEvent = (team: string, pool: WickedEvent[]): WickedEvent | null => {
    if (!isWicked) return null;
    if (!currentQ || !HIGH_VALUE_TIERS.includes(currentQ.points)) return null;
    const deck = wickedDecks[team];
    const idx = wickedDeckIdx[team] || 0;
    const shouldFire = deck ? (deck[idx] ?? false) : false;
    setWickedDeckIdx(d => ({ ...d, [team]: idx + 1 }));
    if (!shouldFire) return null;
    const alreadyUsed = wickedUsedEvents[team] || [];
    const candidates = pool.filter(e => e !== lastEvent && !alreadyUsed.includes(e));
    if (!candidates.length) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  };

  const applyWickedCorrect = (team: string, basePts: number, event: WickedEvent) => {
    const other = isFFA ? String((Number(team) + 1) % players.length) : team === '1' ? '2' : '1';
    setWickedUsedEvents(u => ({ ...u, [team]: [...(u[team] || []), event] }));
    setLastEvent(event);
    setActiveWickedEvent({ event, team });
    setTimeout(() => {
      setActiveWickedEvent(null);
      if (event === 'double')    { setScores(s => ({ ...s, [team]: (s[team] || 0) + basePts * 2 })); closeQuestion(team); }
      else if (event === 'deduct')   { setScores(s => ({ ...s, [team]: (s[team] || 0) - basePts })); closeQuestion(team); }
      else if (event === 'transfer') { setScores(s => ({ ...s, [other]: (s[other] || 0) + basePts })); closeQuestion(other); }
      else if (event === 'noPoints') { closeQuestion(team); }
      else if (event === 'keepTurn') {
        if (!currentQ) return;
        const key = `${currentQ.group}|${currentQ.points}`;
        setUsedCells(s => new Set([...s, key]));
        setCellWinners(w => ({ ...w, [key]: team }));
        setCurrentQ(null); setShowAnswer(false); stopTimer(); setSkipped(false); setShowReveal(false);
        setGaState({ block: false, two: false, steal: false, double: false, doubleTeam: '' });
        // team keeps turn — don't rotate currentTeam
        const total = shuffledGroups.length * TIERS.length;
        if (usedCells.size + 1 >= total) setTimeout(() => onEnd(scores, names), 400); // keepTurn: skip tie-check for simplicity
      }
    }, 2200);
  };

  const correctFor = (team: string) => {
    if (!currentQ) return;
    const basePts = (gaState.double && gaState.doubleTeam === team) ? currentQ.points * 2 : currentQ.points;
    const event = rollWickedEvent(team, WICKED_CORRECT);
    if (event) { applyWickedCorrect(team, basePts, event); return; }
    setScores(s => ({ ...s, [team]: (s[team] || 0) + basePts }));
    closeQuestion(team);
  };
  const noOne = () => {
    const event = rollWickedEvent(ansTeam, ['gotYouuu']);
    if (event === 'gotYouuu' && currentQ) {
      const basePts = currentQ.points;
      setWickedUsedEvents(u => ({ ...u, [ansTeam]: [...(u[ansTeam] || []), 'gotYouuu'] }));
      setLastEvent('gotYouuu');
      setActiveWickedEvent({ event: 'gotYouuu', team: ansTeam });
      setTimeout(() => {
        setActiveWickedEvent(null);
        setScores(s => ({ ...s, [ansTeam]: (s[ansTeam] || 0) + basePts }));
        closeQuestion(ansTeam);
      }, 2200);
      return;
    }
    closeQuestion('');
  };

  const skip = () => {
    if (!currentQ || skipped || gaState.block) return;
    const otherTeam = isFFA
      ? String((Number(currentTeam) + 1) % players.length)
      : currentTeam === '1' ? '2' : '1';
    setAnsTeam(otherTeam);
    setSkipped(true);
    setShowAnswer(false);
    startTimer(30);
  };

  // Steal: instantly transfers question to opponent (like skip but immediate, no option to refuse)
  const steal = () => {
    if (!currentQ || skipped || gaState.double) return;
    const thief = isFFA
      ? String((Number(currentTeam) + 1) % players.length)
      : currentTeam === '1' ? '2' : '1';
    setGaUsed(u => ({ ...u, steal: { ...u.steal, [thief]: true } }));
    setGaState(s => ({ ...s, steal: true }));
    setAnsTeam(thief);
    setSkipped(true);
    startTimer(30);
  };

  const changeQ = () => {
    if (!currentQ) return;
    const q = pickQuestion(currentQ.group, currentQ.points, currentQ.question);
    if (q) { setCurrentQ(q); setShowAnswer(false); startTimer(TIMER_SECS); }
  };

  const revealAnswer = () => { setShowAnswer(true); stopTimer(); };

  const teamKeys = isFFA ? players.map((_, i) => String(i)) : ['1', '2'];
  const wicked = isWicked;

  // ── Sudden death ──
  const sdCorrect = (team: string) => {
    stopTimer();
    const newScores = { ...scores, [team]: (scores[team] || 0) + (sdQ?.points || 500) };
    setScores(newScores);
    setSdPhase('none');
    setSdQ(null);
    onEnd(newScores, names);
  };

  const sdNoOne = () => {
    stopTimer();
    const next = sdCount + 1;
    setSdCount(next);
    if (next >= 3) {
      setSdPhase('none');
      setSdQ(null);
      onEnd(scores, names); // true tie after 3 rounds
    } else {
      const q = pickSuddenDeathQuestion(usedQTexts);
      if (!q) { setSdPhase('none'); setSdQ(null); onEnd(scores, names); return; }
      setUsedQTexts(s => new Set([...s, q.question]));
      setSdQ(q);
      setSdAnsTeam(null);
      setSdPhase('question');
      startTimer(TIMER_SECS);
    }
  };

  if (sdPhase !== 'none' && sdQ) {
    if (!questionsReady) return (
      <div className="screen" style={{ background: '#001B87', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 48, height: 48, border: '4px solid rgba(48,231,237,.2)', borderTop: '4px solid #30E7ED', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
        <div style={{ fontFamily: "'Tajawal',sans-serif", color: 'rgba(255,255,255,.5)', fontSize: 14 }}>جارٍ تحميل الأسئلة...</div>
      </div>
    );

    const teamKeys2 = ['1', '2'];
    return (
      <div className="screen" style={{ background: '#001B87', backgroundImage: 'radial-gradient(circle, rgba(48,231,237,0.12) 1.5px, transparent 1.5px)', backgroundSize: '20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, direction: 'rtl', padding: '20px 24px', animation: 'fadeIn .3s ease both' }}>
        {settingsOpen && <SettingsOverlay onClose={() => setSettingsOpen(false)} onExit={goHome} />}
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 13, color: '#FF3D68', letterSpacing: 2, textTransform: 'uppercase' }}>⚡ موت مفاجئ — {sdCount + 1} / 3</div>
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 11, color: 'rgba(255,255,255,.4)' }}>أجب أولاً لتفوز — 3 أسئلة بدون إجابة = تعادل</div>
        </div>
        {/* Timer */}
        <div style={{ position: 'relative', width: 56, height: 56 }}>
          <svg width="56" height="56" viewBox="0 0 48 48" className="timer-ring" style={{ position: 'absolute', inset: 0 }}>
            <circle cx="24" cy="24" r="20" className="timer-track" strokeWidth="4" />
            <circle cx="24" cy="24" r="20" className={`timer-fill ${timeLeft <= 10 ? 'urgent' : 'ok'}`} strokeWidth="4" strokeDasharray={`${2 * Math.PI * 20}`} strokeDashoffset={`${2 * Math.PI * 20 * (1 - timeLeft / TIMER_SECS)}`} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 16, color: timeLeft <= 10 ? '#FF3D68' : '#30E7ED' }}>{timeLeft}</div>
        </div>
        {/* Question */}
        <div style={{ background: 'rgba(255,255,255,.06)', border: '2px solid rgba(48,231,237,.25)', borderRadius: 14, padding: '20px 24px', maxWidth: 500, width: '100%', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 20, color: '#ffffff', lineHeight: 1.5 }}>{sdQ.question}</div>
        </div>
        {sdPhase === 'question' ? (
          <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 500 }}>
            {teamKeys2.map(k => (
              <button key={k} onClick={() => { stopTimer(); setSdAnsTeam(k); setSdPhase('reveal'); }} style={{ flex: 1, fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 15, background: '#30E7ED', color: '#001B87', border: 'none', borderRadius: 10, padding: '14px 0', cursor: 'pointer', boxShadow: '4px 4px 0 rgba(0,0,0,.3)', clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)' }}>✓ {names[k]}</button>
            ))}
            <button onClick={() => { stopTimer(); setSdPhase('reveal'); }} style={{ flex: 1, fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 15, background: 'rgba(255,61,104,.2)', color: '#FF3D68', border: '1.5px solid #FF3D68', borderRadius: 10, padding: '14px 0', cursor: 'pointer' }}>لا أحد ✕</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 500, alignItems: 'center' }}>
            <div style={{ background: 'rgba(56,226,125,.15)', border: '1.5px solid #38E27D', borderRadius: 10, padding: '10px 20px', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 11, color: 'rgba(255,255,255,.4)' }}>الإجابة الصحيحة</div>
              <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 18, color: '#38E27D' }}>{sdQ.answer}</div>
            </div>
            {sdAnsTeam ? (
              <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                <button onClick={() => sdCorrect(sdAnsTeam)} style={{ flex: 2, fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 15, background: '#38E27D', color: '#001B87', border: 'none', borderRadius: 10, padding: '13px 0', cursor: 'pointer', boxShadow: '4px 4px 0 rgba(0,0,0,.25)' }}>✓ صحيح — فاز {names[sdAnsTeam]}</button>
                <button onClick={sdNoOne} style={{ flex: 1, fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 14, background: 'rgba(255,61,104,.2)', color: '#FF3D68', border: '1.5px solid #FF3D68', borderRadius: 10, padding: '13px 0', cursor: 'pointer' }}>خطأ ✕</button>
              </div>
            ) : (
              <button onClick={sdNoOne} style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 15, background: 'rgba(255,61,104,.2)', color: '#FF3D68', border: '1.5px solid #FF3D68', borderRadius: 10, padding: '13px 24px', cursor: 'pointer' }}>{sdCount + 1 >= 3 ? 'إنهاء — تعادل' : 'السؤال التالي ←'}</button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="screen" style={{ background: '#ffffff', backgroundImage: 'radial-gradient(circle, rgba(0,27,135,0.10) 1.5px, transparent 1.5px)', backgroundSize: '20px 20px', display: 'flex', flexDirection: 'column' }}>
      {settingsOpen && <SettingsOverlay onClose={() => setSettingsOpen(false)} onExit={goHome} />}

      {/* ── Wicked event overlay ── */}
      {activeWickedEvent && (() => {
        const ev = activeWickedEvent.event;
        const nm = names[activeWickedEvent.team];
        const meta: Record<WickedEvent, { emoji: string; label: string; desc: string; color: string }> = {
          double:   { emoji: '🔥', label: 'نقاط مضاعفة!',    desc: `${nm} يحصل على ضعف النقاط`,       color: '#FF9500' },
          deduct:   { emoji: '⚠️', label: 'خصم النقاط!',     desc: `${nm} يخسر النقاط بدل ما يكسبها`, color: '#FF3D68' },
          transfer: { emoji: '😈', label: 'نقل النقاط!',     desc: `نقاط ${nm} راحت للفريق الثاني`,   color: '#c084fc' },
          noPoints: { emoji: '🚫', label: 'بدون نقاط!',      desc: `${nm} أجاب صح بس ما اكتسب شي`,   color: '#6B7280' },
          keepTurn: { emoji: '🔄', label: 'الدور يبقى!',     desc: `${nm} يحتفظ بدوره`,               color: '#30E7ED' },
          gotYouuu: { emoji: '🎉', label: 'خدعناك!',         desc: `${nm} يحصل على النقاط رغم الخطأ`, color: '#38E27D' },
        };
        const m = meta[ev];
        return (
          <div style={{ position: 'absolute', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,8,40,.72)', animation: 'fadeIn .2s ease both' }}>
            <div style={{ background: '#001B87', borderRadius: 20, padding: '32px 44px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, boxShadow: `0 0 60px ${m.color}55`, animation: 'popIn .35s cubic-bezier(.22,1,.36,1) both', direction: 'rtl', minWidth: 260 }}>
              <div style={{ fontSize: 64, lineHeight: 1, animation: 'popIn .5s .1s both' }}>{m.emoji}</div>
              <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 24, color: m.color, textAlign: 'center' }}>{m.label}</div>
              <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 14, color: 'rgba(255,255,255,.65)', textAlign: 'center' }}>{m.desc}</div>
            </div>
          </div>
        );
      })()}

      {/* ── Score bar ── */}
      <div className="score-bar" style={{ position: 'relative' }}>
        {teamKeys.slice(0, isFFA ? Math.ceil(teamKeys.length / 2) : 1).map(k => {
          const active = k === currentTeam && !currentQ;
          const answering = !!currentQ && ansTeam === k;
          return (
            <div key={k} className={`score-team t1 ${active || answering ? 'active' : ''}`}>
              <div style={{ display: 'flex', flexDirection: 'column', direction: 'rtl' }}>
                <div className="score-name" style={{ fontSize: 13 }}>{names[k]}</div>
                <div className="score-pts t1">{scores[k]}</div>
              </div>
            </div>
          );
        })}

        {/* Center: settings + turn indicator */}
        <div className="score-timer">
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 11, fontWeight: 800, color: 'var(--accent)', textAlign: 'center', lineHeight: 1.2, direction: 'rtl', transition: 'color .3s' }}>
            {names[currentTeam]}
            <br />
            <span style={{ fontWeight: 700, color: 'rgba(48,231,237,.65)', fontSize: 10 }}>دورك للإجابة</span>
          </div>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <SettingsBtn onClick={() => setSettingsOpen(true)} />
            {!isFFA && !isWicked && !currentQ && (
              <button className={`action-btn ${doubleArmed ? 'armed' : ''}`}
                disabled={!!gaUsed.double[currentTeam]}
                onClick={() => setDoubleArmed(d => !d)}
                style={{ width: 34, height: 34, padding: 0, borderRadius: 8, fontSize: 17, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                🔥
              </button>
            )}
            {!currentQ && (
              <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 11, fontWeight: 700, color: 'var(--dim)', minWidth: 28, textAlign: 'center' }}>
                {usedCells.size}/{shuffledGroups.length * TIERS.length}
              </div>
            )}
          </div>
        </div>

        {isFFA
          ? teamKeys.slice(Math.ceil(teamKeys.length / 2)).map(k => {
              const active = k === currentTeam && !currentQ;
              const answering = !!currentQ && ansTeam === k;
              return (
                <div key={k} className={`score-team t2 ${active || answering ? 'active' : ''}`}>
                  <div style={{ display: 'flex', flexDirection: 'column', direction: 'rtl', alignItems: 'flex-end' }}>
                    <div className="score-name">{names[k]}</div>
                    <div className="score-pts t2">{scores[k]}</div>
                  </div>
                </div>
              );
            })
          : (() => {
              const active = '2' === currentTeam && !currentQ;
              const answering = !!currentQ && ansTeam === '2';
              return (
                <div className={`score-team t2 ${active || answering ? 'active' : ''}`}>
                  <div style={{ display: 'flex', flexDirection: 'column', direction: 'rtl', alignItems: 'flex-end' }}>
                    <div className="score-name" style={{ fontSize: 13 }}>{names['2']}</div>
                    <div className="score-pts t2">{scores['2']}</div>
                  </div>
                </div>
              );
            })()
        }
      </div>

      {/* ── Board or Question ── */}
      {!currentQ ? (
        <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
          {/* Category headers */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${shuffledGroups.length}, 1fr)`, gap: 6 }}>
            {shuffledGroups.map(g => (
              <div key={g} style={{
                background: 'var(--surface)', borderRadius: 6, padding: '8px 6px',
                fontSize: 'clamp(9px, 1.3vw, 13px)', fontWeight: 700,
                color: 'var(--dim)', textAlign: 'center', direction: 'rtl', lineHeight: 1.2,
              }}>{g}</div>
            ))}
          </div>
          {/* Cells */}
          {TIERS.map(pts => (
            <div key={pts} style={{ display: 'grid', gridTemplateColumns: `repeat(${shuffledGroups.length}, 1fr)`, gap: 6, flex: 1 }}>
              {shuffledGroups.map(g => {
                const key = `${g}|${pts}`;
                const used = usedCells.has(key);
                const winner = cellWinners[key];
                return (
                  <div key={key} className={`board-cell ${used ? 'used' : ''}`}
                    style={used && winner ? { opacity: 0.55, fontSize: 'clamp(8px,1.4vw,13px)', color: 'var(--success)', fontFamily: "'Tajawal',sans-serif", fontWeight: 800, textAlign: 'center', lineHeight: 1.2 } : {}}
                    onClick={() => !used && selectQuestion(g, pts)}>
                    {used ? (winner ? names[winner] : '0') : pts}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : showReveal && currentQ ? (
        /* ── Answer reveal ── */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 40px', gap: 16, animation: 'fadeIn .3s ease both' }}>
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 11, fontWeight: 700, color: 'var(--surface)', letterSpacing: 3, textTransform: 'uppercase' }}>الإجابة الصحيحة</div>
          <div style={{
            background: 'var(--surface)', borderRadius: 10, padding: '18px 32px',
            fontSize: 'clamp(20px, 3vw, 34px)', fontWeight: 900,
            color: 'var(--accent)', textAlign: 'center', direction: 'rtl',
            borderTop: '4px solid var(--accent)',
            boxShadow: '0 0 24px rgba(48,231,237,.18)',
            animation: 'scaleIn .35s cubic-bezier(.22,1,.36,1) both',
          }}>{currentQ.answer}</div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            {isFFA ? (
              <>
                <button className="btn btn-success" style={{ padding: '12px 28px', fontSize: 15, fontFamily: "'Tajawal',sans-serif", fontWeight: 700 }} onClick={() => correctFor(ansTeam)}>
                  ✓ صح
                </button>
                <button className="btn btn-danger" style={{ padding: '12px 28px', fontSize: 15, fontFamily: "'Tajawal',sans-serif", fontWeight: 700 }} onClick={noOne}>✕ خطأ</button>
              </>
            ) : (
              <>
                {teamKeys.map(k => (
                  <button key={k} className="btn btn-success" style={{ padding: '12px 28px', fontSize: 15, fontFamily: "'Tajawal',sans-serif", fontWeight: 700 }} onClick={() => correctFor(k)}>
                    ✓ {names[k]}
                  </button>
                ))}
                <button className="btn btn-danger" style={{ padding: '12px 28px', fontSize: 15, fontFamily: "'Tajawal',sans-serif", fontWeight: 700 }} onClick={noOne}>لا أحد ✕</button>
              </>
            )}
          </div>
        </div>
      ) : (
        /* ── Question panel ── */
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Main: question + action buttons below */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '12px 24px', gap: 10 }}>
            {/* Badge row */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', animation: 'slideUp .25s ease both' }}>
              <div style={{ padding: '4px 12px', borderRadius: 4, background: 'var(--surface)', fontSize: 12, fontWeight: 700, color: 'var(--dim)', direction: 'rtl' }}>{currentQ.group}</div>
              <div style={{ padding: '4px 14px', borderRadius: 4, fontSize: 14, fontWeight: 900, fontFamily: "'Tajawal',sans-serif", background: gaState.double ? 'var(--danger)' : 'var(--accent)', color: '#001B87' }}>
                {gaState.double ? `🔥 ${currentQ.points * 2}` : currentQ.points}
              </div>
              {gaState.steal && <div style={{ padding: '4px 10px', borderRadius: 4, background: 'rgba(255,61,104,.15)', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: 12, fontWeight: 700 }}>🦊 {names[ansTeam]}</div>}
              {gaState.two && <div style={{ padding: '4px 10px', borderRadius: 4, background: 'rgba(48,231,237,.1)', border: '1px solid var(--accent)', color: 'var(--accent)', fontSize: 12, fontWeight: 700 }}>2️⃣</div>}
            </div>
            {/* Question */}
            <div style={{
              background: 'var(--surface)', borderRadius: 8, padding: '16px 22px',
              fontSize: 'clamp(16px, 2.3vw, 26px)', fontWeight: 700,
              lineHeight: 1.6, textAlign: 'right', direction: 'rtl',
              borderRight: '4px solid var(--accent)',
              animation: 'slideUp .3s cubic-bezier(.22,1,.36,1) both',
              flex: 1, display: 'flex', alignItems: 'center',
            }}>
              {currentQ.question}
            </div>
            {/* Action buttons row */}
            <div style={{ display: 'flex', gap: 8, animation: 'slideUp .3s ease .05s both' }}>
              <button style={{ background: '#001B87', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, fontFamily: "'Tajawal',sans-serif", cursor: (skipped || gaState.block || gaState.steal) ? 'not-allowed' : 'pointer', boxShadow: '0 3px 0 rgba(0,0,0,.25)', opacity: (skipped || gaState.block || gaState.steal) ? 0.35 : 1 }} disabled={skipped || gaState.block || gaState.steal} onClick={changeQ}>🔄 تغيير</button>
              {!isFFA && (
                !skipped && !gaState.block && !gaState.steal ? (
                  <button style={{ background: '#001B87', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, fontFamily: "'Tajawal',sans-serif", cursor: 'pointer', boxShadow: '0 3px 0 rgba(0,0,0,.25)', direction: 'rtl' }} onClick={skip}>إنهاء ←</button>
                ) : (
                  <button style={{ background: '#001B87', color: 'var(--accent)', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, fontFamily: "'Tajawal',sans-serif", cursor: 'pointer', boxShadow: '0 3px 0 rgba(0,0,0,.25)', direction: 'rtl' }} onClick={() => { stopTimer(); setShowReveal(true); }}>
                    {`إنهاء ${names[ansTeam]} ←`}
                  </button>
                )
              )}
              {isFFA && (
                <button style={{ background: '#001B87', color: 'var(--accent)', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, fontFamily: "'Tajawal',sans-serif", cursor: 'pointer', boxShadow: '0 3px 0 rgba(0,0,0,.25)', direction: 'rtl' }} onClick={() => { stopTimer(); setShowReveal(true); }}>إنهاء ←</button>
              )}
              {!isFFA && !skipped && (
                <>
                  <button style={{ background: gaState.block ? 'var(--danger)' : '#001B87', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, fontFamily: "'Tajawal',sans-serif", cursor: 'pointer', boxShadow: '0 3px 0 rgba(0,0,0,.25)', opacity: (!!gaUsed.block[currentTeam] || gaState.steal || gaState.double) ? 0.35 : 1 }}
                    disabled={!!gaUsed.block[currentTeam] || gaState.block || gaState.steal || gaState.double}
                    onClick={() => { setGaUsed(u => ({ ...u, block: { ...u.block, [currentTeam]: true } })); setGaState(s => ({ ...s, block: true })); }}>
                    🛑 منع
                  </button>
                  <button style={{ background: gaState.steal ? '#30E7ED' : '#001B87', color: gaState.steal ? '#001B87' : '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, fontFamily: "'Tajawal',sans-serif", cursor: 'pointer', boxShadow: '0 3px 0 rgba(0,0,0,.25)', opacity: (!!gaUsed.steal[currentTeam === '1' ? '2' : '1'] || gaState.block || gaState.double) ? 0.35 : 1 }}
                    disabled={!!gaUsed.steal[currentTeam === '1' ? '2' : '1'] || gaState.steal || gaState.block || gaState.double}
                    onClick={steal}>
                    🦊 سرقة
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right: timer only */}
          <div style={{ width: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 14px 14px 0', flexShrink: 0 }}>
            <TimerArc t={timeLeft} total={TIMER_SECS} />
          </div>
        </div>
      )}
    </div>
  );
}

