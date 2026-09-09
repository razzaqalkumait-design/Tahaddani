import { BackBtn } from '../components/BackBtn';
import { SettingsBtn, SettingsOverlay } from '../components/SettingsOverlay';
import { AccountCtx } from '../contexts/AccountContext';
import { NavCtx } from '../contexts/NavContext';
import { fetchThirtyQuestion } from '../api';
import { useContext, useEffect, useRef, useState } from 'react';
import type { ThirtyQ } from '../api';

// ─── Thirty Game ─────────────────────────────────────
// ThirtyQ type comes from api.ts import at top of file
// Category list (just names) — not sensitive, no question content
export const THIRTY_CATS_UNIQUE = [
  "اسلاميات","معلومات عامة","رياضة","تاريخ","علوم","جغرافيا",
  "ثقافة عامة","سينما","موسيقى","تكنولوجيا","فن","أدب",
];

export type ThirtyPhase = 'setup' | 'catpick' | 'bidding' | 'playing' | 'result' | 'endGame';

export function ThirtySetupStub({ onBack }: { onBack: () => void }) {
  const { account } = useContext(AccountCtx);
  const [phase, setPhase] = useState<ThirtyPhase>('setup');
  const [p0, setP0] = useState(() => account?.name ?? '');
  const [p1, setP1] = useState('');
  const [cat, setCat] = useState('');
  const [loadingQ, setLoadingQ] = useState(false);
  const [question, setQuestion] = useState<ThirtyQ | null>(null);
  const [bid, setBid] = useState(1);
  const [lastBidder, setLastBidder] = useState<0 | 1>(0);
  const [turn, setTurn] = useState<0 | 1>(0); // who bids next
  const [bidder, setBidder] = useState<0 | 1>(0); // who won
  const [checked, setChecked] = useState<boolean[]>([]);
  const [timeLeft, setTimeLeft] = useState(30);
  const [answersRevealed, setAnswersRevealed] = useState(false);
  const [answerCount, setAnswerCount] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [round, setRound] = useState(1);
  const MAX_ROUNDS = 10;
  const [usedThirtyQTexts, setUsedThirtyQTexts] = useState<Set<string>>(new Set());
  // Sudden death (thirty)
  const [sdThirtyPhase, setSdThirtyPhase] = useState<'none' | 'question' | 'reveal'>('none');
  const [sdThirtyQ, setSdThirtyQ] = useState<ThirtyQ | null>(null);
  const [sdThirtyCount, setSdThirtyCount] = useState(0);
  const [sdThirtyWinner, setSdThirtyWinner] = useState<0 | 1 | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  const calcPoints = (b: number) => b < 10 ? 1 : b < 20 ? 2 : 3;

  useEffect(() => {
    if (timeLeft === 0 && timerRunning) {
      setTimerRunning(false);
      setScores(s => {
        const next: [number, number] = [...s] as [number, number];
        next[answerCount >= bid ? bidder : (bidder === 0 ? 1 : 0)] += answerCount >= bid ? calcPoints(bid) : 1;
        return next;
      });
      setPhase('result');
    }
  }, [timeLeft, timerRunning]);

  const correct = answerCount;
  const won = correct >= bid;

  const endRound = () => {
    setTimerRunning(false);
    setScores(s => {
      const next: [number, number] = [...s] as [number, number];
      if (won) next[bidder] += calcPoints(bid);
      else next[bidder === 0 ? 1 : 0] += 1;
      return next;
    });
    setPhase('result');
  };

  const [selCat, setSelCat] = useState<string | null>(null);

  const pickCat = async (c: string) => {
    setLoadingQ(true);
    const q = await fetchThirtyQuestion(c).catch(() => null);
    setLoadingQ(false);
    if (!q) return;
    setUsedThirtyQTexts(s => new Set([...s, q.answers.join('|')]));
    setCat(c);
    setQuestion(q);
    setChecked(new Array(q.answers.length).fill(false));
    setBid(1);
    setTurn(0);
    setPhase('bidding');
  };

  const raiseBid = () => {
    setBid(b => b + 1);
    setLastBidder(turn);
    setTurn(t => (t === 0 ? 1 : 0));
  };

  const passBid = () => {
    const winner = turn === 0 ? 1 : 0;
    setBidder(winner as 0 | 1);
    setAnswersRevealed(false);
    setAnswerCount(0);
    setTimeLeft(30);
    setPhase('playing');
    setTimerRunning(true);
  };

  const nextQuestion = async () => {
    const nextRound = round + 1;
    if (nextRound > MAX_ROUNDS) { setPhase('endGame'); return; }
    setLoadingQ(true);
    const q = await fetchThirtyQuestion(cat).catch(() => null);
    setLoadingQ(false);
    if (!q) return;
    setQuestion(q);
    setChecked(new Array(q.answers.length).fill(false));
    setBid(1);
    setTurn(0);
    setAnswersRevealed(false);
    setAnswerCount(0);
    setTimeLeft(30);
    setTimerRunning(false);
    setRound(nextRound);
    setPhase('bidding');
  };

  const players = [p0 || 'لاعب ١', p1 || 'لاعب ٢'];

  const [settingsOpen, setSettingsOpen] = useState(false);
  const { goHome } = useContext(NavCtx);

  const BG: React.CSSProperties = {
    background: '#ffffff',
    backgroundImage: 'radial-gradient(circle, rgba(0,27,135,0.10) 1.5px, transparent 1.5px)',
    backgroundSize: '20px 20px',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'flex-start', padding: 0, direction: 'rtl',
    animation: 'fadeIn .3s ease both', overflow: 'hidden',
  };

  if (phase === 'setup') return (
    <div className="screen" style={BG}>
      <div style={{ width: '100%', padding: '20px 24px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackBtn onBack={onBack} />
        <span style={{ color: '#001B87', fontWeight: 900, fontSize: 22 }}>تحدي الثلاثين ⏱</span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, width: '100%', maxWidth: 500, padding: '0 24px' }}>
        <div style={{ width: '100%', background: '#001B87', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 20, clipPath: 'polygon(0% 0%, 100% 2%, 98% 100%, 0% 100%)' }}>
          <div style={{ color: '#30E7ED', fontWeight: 800, fontSize: 15, letterSpacing: 1 }}>أسماء اللاعبين</div>
          {[0, 1].map(i => (
            <input key={i} value={i === 0 ? p0 : p1} onChange={e => i === 0 ? setP0(e.target.value) : setP1(e.target.value)}
              placeholder={`اسم اللاعب ${i === 0 ? 'الأول' : 'الثاني'}`}
              style={{ width: '100%', background: 'rgba(255,255,255,.12)', border: '2px solid rgba(48,231,237,.4)', borderRadius: 10, padding: '14px 16px', color: '#fff', fontSize: 17, fontWeight: 700, outline: 'none', direction: 'rtl' }} />
          ))}
        </div>
        <button onClick={() => setPhase('catpick')} disabled={!p0.trim() || !p1.trim()}
          style={{ background: p0.trim() && p1.trim() ? '#30E7ED' : 'rgba(48,231,237,.3)', color: '#001B87', fontWeight: 900, fontSize: 18, border: 'none', borderRadius: 12, padding: '16px 56px', boxShadow: '5px 5px 0 #001B87', cursor: 'pointer', clipPath: 'polygon(3% 0%, 100% 0%, 97% 100%, 0% 100%)' }}>
          اختر الفئة →
        </button>
      </div>
    </div>
  );

  if (phase === 'catpick') return (
    <div className="screen" style={BG}>
      <div style={{ width: '100%', padding: '20px 24px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackBtn onBack={() => setPhase('setup')} />
        <span style={{ color: '#001B87', fontWeight: 900, fontSize: 22 }}>اختر الفئة</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: '24px 24px 100px', justifyContent: 'center', width: '100%', maxWidth: 600 }}>
        {THIRTY_CATS_UNIQUE.map(c => {
          const sel = selCat === c;
          return (
            <button key={c} onClick={() => setSelCat(s => s === c ? null : c)} style={{
              background: sel ? '#001B87' : '#30E7ED',
              color: sel ? '#30E7ED' : '#001B87',
              fontWeight: 800, fontSize: 15, border: sel ? '2px solid #30E7ED' : 'none',
              borderRadius: 10, padding: '12px 22px',
              boxShadow: sel ? '4px 4px 0 #30E7ED' : '4px 4px 0 #001B87',
              cursor: 'pointer', clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)',
              transform: sel ? 'scale(1.05)' : 'scale(1)', transition: 'all .15s',
            }}>{c}</button>
          );
        })}
        <button onClick={() => setSelCat('🎲')} style={{
          background: selCat === '🎲' ? '#001B87' : 'rgba(0,27,135,.12)',
          color: selCat === '🎲' ? '#30E7ED' : '#001B87', fontWeight: 800, fontSize: 15,
          border: selCat === '🎲' ? '2px solid #30E7ED' : '1px solid rgba(0,27,135,.2)',
          borderRadius: 10, padding: '12px 22px',
          cursor: 'pointer', clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)',
          transform: selCat === '🎲' ? 'scale(1.05)' : 'scale(1)', transition: 'all .15s',
        }}>🎲 عشوائي</button>
      </div>

      {/* Play Now button slides in from lower-right when a category is selected */}
      <div style={{
        position: 'fixed', bottom: 28, right: 24,
        transform: selCat ? 'translateX(0)' : 'translateX(120%)',
        transition: 'transform .35s cubic-bezier(.22,1,.36,1)',
        zIndex: 50,
      }}>
        <button onClick={() => {
          if (!selCat) return;
          if (selCat === '🎲') {
            const randomCat = THIRTY_CATS_UNIQUE[Math.floor(Math.random() * THIRTY_CATS_UNIQUE.length)];
            pickCat(randomCat);
          } else {
            pickCat(selCat);
          }
        }} style={{
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

  const Scoreboard = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: '#30E7ED', borderRadius: 10, overflow: 'hidden', boxShadow: '3px 3px 0 #001B87', flexShrink: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '5px 14px', minWidth: 60 }}>
        <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 22, color: '#001B87', lineHeight: 1 }}>{scores[0]}</div>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(0,27,135,.6)', maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{players[0]}</div>
      </div>
      <div style={{ width: 2, alignSelf: 'stretch', background: 'rgba(0,27,135,.15)' }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '5px 14px', minWidth: 60 }}>
        <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 22, color: '#001B87', lineHeight: 1 }}>{scores[1]}</div>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(0,27,135,.6)', maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{players[1]}</div>
      </div>
    </div>
  );

  if (phase === 'bidding' && question) return (
    <div className="screen" style={{ ...BG, flexDirection: 'row', alignItems: 'stretch' }}>
      {settingsOpen && <SettingsOverlay onClose={() => setSettingsOpen(false)} onExit={goHome} />}

      {/* LEFT — question */}
      <div style={{ flex: '0 0 55%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '16px 12px 16px 20px', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ color: '#001B87', fontWeight: 900, fontSize: 15 }}>المزاد</span>
          <span style={{ background: 'rgba(0,27,135,.1)', color: '#001B87', borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>{cat}</span>
        </div>
        <div style={{ background: '#001B87', borderRadius: 10, padding: '14px 18px', clipPath: 'polygon(0% 0%, 100% 2%, 98% 100%, 0% 100%)', boxShadow: '4px 4px 0 #30E7ED' }}>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 16, lineHeight: 1.4 }}>{question.question}</div>
          {question.note && <div style={{ color: '#30E7ED', fontSize: 12, marginTop: 6 }}>ملاحظة: {question.note}</div>}
        </div>
        <div style={{ color: 'rgba(0,27,135,.55)', fontSize: 15, textAlign: 'center', fontWeight: 700 }}>دور: <strong style={{ color: '#001B87', fontSize: 18 }}>{players[turn]}</strong></div>
      </div>

      <div style={{ position: 'fixed', top: 8, right: 8, zIndex: 20 }}><SettingsBtn onClick={() => setSettingsOpen(true)} /></div>
      {/* RIGHT — bid counter + actions */}
      <div style={{ flex: 1, background: '#001B87', clipPath: 'polygon(8% 0%, 100% 0%, 100% 100%, 0% 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px 18px' }}>
        <Scoreboard />
        <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 11, fontWeight: 700 }}>عدد الإجابات</div>
        <div style={{ color: '#30E7ED', fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 56, lineHeight: 1 }}>{bid}</div>
        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          <button onClick={raiseBid} style={{
            flex: 1, background: '#30E7ED', color: '#001B87', fontWeight: 900, fontSize: 15,
            border: 'none', borderRadius: 8, padding: '12px 0',
            boxShadow: '3px 3px 0 rgba(0,0,0,.3)', cursor: 'pointer',
            clipPath: 'polygon(5% 0%, 100% 0%, 95% 100%, 0% 100%)',
          }}>+١ زيادة</button>
          <button onClick={passBid} disabled={bid === 1} style={{
            flex: 1, background: bid > 1 ? '#FF3D68' : 'rgba(255,61,104,.2)', color: bid > 1 ? '#fff' : 'rgba(255,255,255,.35)', fontWeight: 900, fontSize: 15,
            border: 'none', borderRadius: 8, padding: '12px 0',
            boxShadow: bid > 1 ? '3px 3px 0 rgba(0,0,0,.3)' : 'none', cursor: bid > 1 ? 'pointer' : 'default',
            clipPath: 'polygon(0% 0%, 95% 0%, 100% 100%, 5% 100%)',
          }}>تمرير ✋</button>
        </div>
        {bid === 1 && <div style={{ color: 'rgba(255,255,255,.3)', fontSize: 11, textAlign: 'center' }}>يجب أن يزيد أحد اللاعبين أولاً</div>}
      </div>
    </div>
  );

  if (phase === 'playing' && question) return (
    <div className="screen" style={{ ...BG, flexDirection: 'row', alignItems: 'stretch', padding: 0, gap: 0, overflow: 'hidden' }}>
      {settingsOpen && <SettingsOverlay onClose={() => setSettingsOpen(false)} onExit={goHome} />}

      {/* LEFT — question + answers */}
      <div style={{ flex: '0 0 54%', display: 'flex', flexDirection: 'column', padding: '12px 12px 12px 18px', gap: 8, overflow: 'hidden' }}>
        {/* top row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#001B87', fontWeight: 900, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{players[bidder]}</div>
            <div style={{ color: 'rgba(0,27,135,.5)', fontSize: 11 }}>يجب الإجابة على {bid} إجابة</div>
          </div>
          <SettingsBtn onClick={() => setSettingsOpen(true)} />
        </div>

        {/* question card */}
        <div style={{ background: '#001B87', borderRadius: 10, padding: '12px 16px', textAlign: 'center', clipPath: 'polygon(0% 0%, 100% 2%, 98% 100%, 0% 100%)', boxShadow: '4px 4px 0 #30E7ED', flexShrink: 0 }}>
          <div style={{ color: 'rgba(255,255,255,.45)', fontSize: 11, marginBottom: 3 }}>{cat}</div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, lineHeight: 1.3 }}>{question.question}</div>
        </div>

        {/* answers area */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {!answersRevealed ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ color: 'rgba(0,27,135,.35)', fontSize: 13, fontWeight: 700, textAlign: 'center', direction: 'rtl' }}>
                {question.answers.length} إجابة مخفية
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignContent: 'flex-start' }}>
              {question.answers.map((a, i) => (
                <div key={i} style={{
                  background: '#001B87', color: '#fff', borderRadius: 7,
                  padding: '7px 12px', fontWeight: 700, fontSize: 12,
                  boxShadow: '2px 2px 0 rgba(0,27,135,.3)',
                  animation: `popIn .35s cubic-bezier(.22,1,.36,1) ${i * 60}ms both`,
                }}>{a}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT — timer + reveal + counter + end */}
      <div style={{ flex: 1, background: '#001B87', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px 14px', position: 'relative', clipPath: 'polygon(8% 0%, 100% 0%, 100% 100%, 0% 100%)' }}>
        <Scoreboard />
        {/* timer */}
        <div style={{
          background: timeLeft <= 10 ? '#FF3D68' : '#30E7ED',
          color: timeLeft <= 10 ? '#fff' : '#001B87',
          fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 42,
          borderRadius: 14, padding: '6px 20px',
          boxShadow: timeLeft <= 10 ? '0 0 0 3px rgba(255,61,104,.4), 4px 4px 0 rgba(0,0,0,.4)' : '4px 4px 0 rgba(0,0,0,.35)',
          minWidth: 90, textAlign: 'center',
          animation: timeLeft <= 10 ? 'urgentPulse .7s ease-in-out infinite' : undefined,
          transition: 'background .3s, color .3s',
        }}>{timeLeft}s</div>

        {/* reveal button */}
        {!answersRevealed && (
          <button onClick={() => setAnswersRevealed(true)} style={{
            background: '#30E7ED', color: '#001B87', border: 'none',
            fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 14,
            borderRadius: 10, padding: '8px 18px', cursor: 'pointer',
            boxShadow: '4px 4px 0 rgba(0,0,0,.35)',
            clipPath: 'polygon(5% 0%, 100% 0%, 95% 100%, 0% 100%)',
          }}>👁 كشف الإجابات</button>
        )}

        {/* +1 counter — always visible */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ color: 'rgba(255,255,255,.45)', fontSize: 11, fontWeight: 700 }}>الإجابات الصحيحة</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setAnswerCount(c => Math.max(0, c - 1))} style={{
              background: 'rgba(255,255,255,.1)', color: '#fff', border: '2px solid rgba(255,255,255,.2)',
              borderRadius: 8, width: 32, height: 32, fontSize: 18, fontWeight: 900, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>−</button>
            <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 40, color: answerCount >= bid ? '#38E27D' : '#fff', minWidth: 48, textAlign: 'center', lineHeight: 1 }}>{answerCount}</div>
            <button onClick={() => setAnswerCount(c => Math.min(question.answers.length, c + 1))} style={{
              background: '#30E7ED', color: '#001B87', border: 'none',
              borderRadius: 8, width: 42, height: 42, fontSize: 22, fontWeight: 900, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '3px 3px 0 rgba(0,0,0,.35)',
            }}>+</button>
          </div>
          <div style={{ color: 'rgba(255,255,255,.35)', fontSize: 11 }}>من {bid} مطلوبة</div>
        </div>

        {/* end round button */}
        <button onClick={endRound} style={{
          background: won ? '#38E27D' : 'rgba(255,255,255,.12)',
          color: won ? '#001B87' : 'rgba(255,255,255,.7)',
          fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 13,
          border: won ? 'none' : '2px solid rgba(255,255,255,.2)',
          borderRadius: 10, padding: '9px 20px', cursor: 'pointer',
          boxShadow: won ? '4px 4px 0 rgba(0,0,0,.35)' : 'none',
          clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)',
          transition: 'all .2s',
        }}>إنهاء الجولة {won ? '✓' : ''}</button>
      </div>
    </div>
  );

  if (phase === 'result' && question) return (
    <div className="screen" style={{ ...BG, flexDirection: 'row', alignItems: 'stretch' }}>
      {/* LEFT — verdict */}
      <div style={{ flex: '0 0 42%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 12px 16px 20px' }}>
        <Scoreboard />
        <div style={{ fontSize: 56, animation: 'popIn .4s ease both', lineHeight: 1 }}>{won ? '🏆' : '💥'}</div>
        <div style={{ color: won ? '#38E27D' : '#FF3D68', fontWeight: 900, fontSize: 26, textAlign: 'center' }}>
          {won ? 'أحسنت!' : 'انتهى الوقت!'}
        </div>
        <div style={{ color: '#001B87', fontSize: 13, textAlign: 'center', lineHeight: 1.5 }}>
          {players[bidder]} أجاب على <strong style={{ color: '#001B87', fontSize: 18 }}>{correct}</strong> من أصل <strong>{bid}</strong>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', marginTop: 4 }}>
          <button onClick={nextQuestion} style={{
            background: '#30E7ED', color: '#001B87', fontWeight: 900, fontSize: 14,
            border: 'none', borderRadius: 10, padding: '12px 0', width: '100%',
            boxShadow: '4px 4px 0 #001B87', cursor: 'pointer',
            clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)',
          }}>{round >= MAX_ROUNDS ? 'النتيجة ←' : 'السؤال التالي ←'}</button>
          <button onClick={onBack} style={{
            background: 'transparent', color: 'rgba(0,27,135,.55)', fontWeight: 700, fontSize: 13,
            border: '1px solid rgba(0,27,135,.2)', borderRadius: 10, padding: '10px 0', width: '100%',
            cursor: 'pointer',
          }}>القائمة الرئيسية</button>
        </div>
      </div>

      {/* RIGHT — all answers */}
      <div style={{ flex: 1, background: '#001B87', clipPath: 'polygon(8% 0%, 100% 0%, 100% 100%, 0% 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10, padding: '16px 18px' }}>
        <div style={{ color: '#30E7ED', fontWeight: 800, fontSize: 13 }}>جميع الإجابات ({question.answers.length})</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignContent: 'flex-start', overflow: 'hidden', maxHeight: 260 }}>
          {question.answers.map((a, i) => (
            <span key={i} style={{
              background: 'rgba(255,255,255,.12)', color: '#fff', borderRadius: 7,
              padding: '6px 12px', fontSize: 13, fontWeight: 700,
              animation: `popIn .3s cubic-bezier(.22,1,.36,1) ${i * 40}ms both`,
            }}>{a}</span>
          ))}
        </div>
      </div>
    </div>
  );

  // Thirty sudden death helpers
  const startThirtySd = async () => {
    setLoadingQ(true);
    const q = await fetchThirtyQuestion(cat).catch(() => null);
    setLoadingQ(false);
    if (!q) { setSdThirtyPhase('reveal'); setSdThirtyQ(null); return; }
    setUsedThirtyQTexts(s => new Set([...s, q.answers.join('|')]));
    setSdThirtyQ(q);
    setSdThirtyWinner(null);
    setSdThirtyPhase('question');
  };

  const sdThirtyCorrect = (bidIdx: 0 | 1, correct: number, total: number) => {
    // winner only if all bid answers correct
    if (correct >= total) {
      setSdThirtyPhase('none');
      const w = bidIdx;
      const newScores: [number, number] = [scores[0], scores[1]];
      newScores[w] += 100;
      setScores(newScores);
      setPhase('endGame'); // back to endGame with clear winner
    } else {
      // didn't get all — next sd question or tie
      const next = sdThirtyCount + 1;
      setSdThirtyCount(next);
      if (next >= 3) { setSdThirtyPhase('none'); setPhase('endGame'); }
      else startThirtySd();
    }
  };

  if (phase === 'endGame' && sdThirtyPhase === 'none') {
    const winner = scores[0] > scores[1] ? 0 : scores[1] > scores[0] ? 1 : -1;
    const isTie = winner === -1 && sdThirtyCount < 3;
    // trigger sudden death if tied and haven't exhausted rounds
    if (isTie && sdThirtyCount === 0) {
      // auto-start sudden death on first visit
      setTimeout(() => startThirtySd(), 400);
    }
    if (isTie && sdThirtyCount > 0 && sdThirtyCount < 3) {
      // still in sd loop — startThirtySd already called
    }
    const trueTie = scores[0] === scores[1] && sdThirtyCount >= 3;
    const resolvedWinner = scores[0] > scores[1] ? 0 : scores[1] > scores[0] ? 1 : -1;
    const showTie = resolvedWinner === -1;
    const sortedPlayers = showTie ? [0, 1] : resolvedWinner === 0 ? [0, 1] : [1, 0];
    return (
      <div className="screen" style={{ background: '#ffffff', backgroundImage: 'radial-gradient(circle, rgba(0,27,135,0.10) 1.5px, transparent 1.5px)', backgroundSize: '20px 20px', display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
        {/* LEFT — winner panel */}
        <div style={{ width: '42%', background: '#001B87', clipPath: 'polygon(0% 0%, 100% 0%, 88% 100%, 0% 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '28px 36px 28px 28px', animation: 'slideRight .45s cubic-bezier(.22,1,.36,1) both' }}>
          <div style={{ fontSize: 56, lineHeight: 1, animation: 'popIn .5s .15s both' }}>{isTie ? '🤝' : '👑'}</div>
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 10, fontWeight: 800, color: 'rgba(48,231,237,.55)', letterSpacing: 4, textTransform: 'uppercase', marginTop: 4 }}>{showTie ? 'تعادل' : 'الفائز'}</div>
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 30, color: '#30E7ED', textAlign: 'center', lineHeight: 1.2, direction: 'rtl', animation: 'slideUp .4s .2s both' }}>
            {showTie ? players.join(' و ') : players[resolvedWinner >= 0 ? resolvedWinner : 0]}
          </div>
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 48, color: '#ffffff', lineHeight: 1, animation: 'popIn .5s .3s both' }}>{scores[resolvedWinner >= 0 ? (resolvedWinner as 0 | 1) : 0]}</div>
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 12, color: 'rgba(255,255,255,.35)', fontWeight: 700 }}>نقطة</div>
          <button onClick={onBack} style={{ marginTop: 12, background: '#30E7ED', color: '#001B87', fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 15, border: 'none', borderRadius: 10, padding: '12px 32px', boxShadow: '4px 4px 0 rgba(0,0,0,.25)', clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)', cursor: 'pointer', animation: 'slideUp .4s .35s both' }}>القائمة ↩</button>
        </div>
        {/* RIGHT — standings */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '20px 28px 20px 20px', gap: 8, direction: 'rtl' }}>
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 11, fontWeight: 800, color: 'rgba(0,27,135,.4)', letterSpacing: 3, marginBottom: 4 }}>الترتيب النهائي</div>
          {sortedPlayers.map((pi, i) => (
            <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: 12, background: i === 0 && !showTie ? '#001B87' : 'rgba(0,27,135,.06)', borderRadius: 8, padding: '14px 16px', border: i === 0 && !showTie ? 'none' : '1.5px solid rgba(0,27,135,.1)', animation: `slideLeft .35s cubic-bezier(.22,1,.36,1) ${i * 60}ms both` }}>
              <div style={{ fontSize: 20, flexShrink: 0 }}>{i === 0 ? '🥇' : '🥈'}</div>
              <div style={{ flex: 1, fontFamily: "'Tajawal',sans-serif", fontWeight: 800, fontSize: 15, color: i === 0 && !showTie ? '#30E7ED' : '#001B87' }}>{players[pi]}</div>
              <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 22, color: i === 0 && !showTie ? '#ffffff' : 'rgba(0,27,135,.5)' }}>{scores[pi]}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Thirty sudden death question screen
  if (phase === 'endGame' && sdThirtyPhase !== 'none') {
    const q = sdThirtyQ;
    const checkedSd = sdThirtyWinner !== null ? (q?.answers.map(() => true) ?? []) : [];
    const correctCount = checkedSd.filter(Boolean).length;
    return (
      <div className="screen" style={{ background: '#001B87', backgroundImage: 'radial-gradient(circle, rgba(48,231,237,0.12) 1.5px, transparent 1.5px)', backgroundSize: '20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, direction: 'rtl', padding: '20px 28px', animation: 'fadeIn .3s ease both' }}>
        <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 13, color: '#FF3D68', letterSpacing: 2 }}>⚡ موت مفاجئ — {sdThirtyCount + 1} / 3</div>
        <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 12, color: 'rgba(255,255,255,.4)' }}>يجب الإجابة على كل الأجوبة للفوز</div>
        {q && (
          <>
            <div style={{ background: 'rgba(255,255,255,.08)', border: '2px solid rgba(48,231,237,.25)', borderRadius: 14, padding: '18px 24px', maxWidth: 520, width: '100%', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 18, color: '#fff' }}>{q.question}</div>
              <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>{q.answers.length} إجابة مطلوبة</div>
            </div>
            {sdThirtyPhase === 'question' && (
              <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 520 }}>
                {([0, 1] as const).map(pi => (
                  <button key={pi} onClick={() => { setSdThirtyWinner(pi); setSdThirtyPhase('reveal'); }} style={{ flex: 1, fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 14, background: '#30E7ED', color: '#001B87', border: 'none', borderRadius: 10, padding: '13px 0', cursor: 'pointer', boxShadow: '4px 4px 0 rgba(0,0,0,.3)', clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)' }}>▶ {players[pi]}</button>
                ))}
              </div>
            )}
            {sdThirtyPhase === 'reveal' && sdThirtyWinner !== null && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 520 }}>
                <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 12, color: 'rgba(255,255,255,.5)', textAlign: 'center' }}>{players[sdThirtyWinner]} يجاوب — علّم كل إجابة صحيحة</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                  {q.answers.map((a, i) => {
                    const [chk, setChk] = useState(false);
                    return <button key={i} onClick={() => setChk(c => !c)} style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 700, fontSize: 13, padding: '7px 14px', borderRadius: 8, border: chk ? '2px solid #38E27D' : '1.5px solid rgba(255,255,255,.2)', background: chk ? 'rgba(56,226,125,.2)' : 'rgba(255,255,255,.07)', color: chk ? '#38E27D' : '#fff', cursor: 'pointer', transition: 'all .15s' }}>{a}</button>;
                  })}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => sdThirtyCorrect(sdThirtyWinner, q.answers.length, q.answers.length)} style={{ flex: 2, fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 14, background: '#38E27D', color: '#001B87', border: 'none', borderRadius: 10, padding: '12px 0', cursor: 'pointer', boxShadow: '4px 4px 0 rgba(0,0,0,.25)' }}>✓ أجاب على الكل — فاز!</button>
                  <button onClick={() => sdThirtyCorrect(sdThirtyWinner, 0, q.answers.length)} style={{ flex: 1, fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 13, background: 'rgba(255,61,104,.2)', color: '#FF3D68', border: '1.5px solid #FF3D68', borderRadius: 10, padding: '12px 0', cursor: 'pointer' }}>ناقص ✕</button>
                </div>
              </div>
            )}
          </>
        )}
        {!q && <div style={{ fontFamily: "'Tajawal',sans-serif", color: 'rgba(255,255,255,.4)', fontSize: 13 }}>لا توجد أسئلة متاحة — تعادل</div>}
      </div>
    );
  }

  return null;
}

