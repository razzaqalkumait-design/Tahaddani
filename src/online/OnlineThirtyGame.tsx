import { BackBtn } from '../components/BackBtn';
import { SettingsBtn, SettingsOverlay } from '../components/SettingsOverlay';
import { AccountCtx } from '../contexts/AccountContext';
import { NavCtx } from '../contexts/NavContext';
import { THIRTY_CATS_UNIQUE } from '../games/ThirtySetupStub';
import { OnlineLobby } from './OnlineLobby';
import { makeRoomCode, makeSbClient } from './helpers';
import { fetchThirtyQuestion } from '../api';
import { useContext, useEffect, useRef, useState } from 'react';

// ─── Online Thirty ────────────────────────────────────
export type OThirtyPhase = 'menu' | 'creating' | 'joining' | 'game';
export interface OThirtyState {
  phase: 'lobby' | 'catpick' | 'bidding' | 'playing' | 'result';
  players: { seat: number; name: string }[];
  catKey?: string;
  question?: { category: string; question: string; answers: string[]; note?: string };
  bid: number;
  turnSeat: number;
  lastBidSeat: number;
  bidderSeat: number;
  checked: boolean[];
  timeLeft: number;
  timerRunning: boolean;
}

export function OnlineThirtyGame({ onBack, autoJoinCode, hostCode }: { onBack: () => void; autoJoinCode?: string; hostCode?: string }) {
  const [phase, setPhase] = useState<OThirtyPhase>('menu');
  const { account: thirtyAccount } = useContext(AccountCtx);
  const [myName, setMyName] = useState(() => thirtyAccount?.name ?? '');
  const [joinCode, setJoinCode] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mySeat, setMySeat] = useState<0 | 1>(0);
  const [err, setErr] = useState('');
  const [selCat, setSelCat] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { goHome } = useContext(NavCtx);
  const [room, setRoom] = useState<OThirtyState>({ phase: 'lobby', players: [], bid: 1, turnSeat: 0, lastBidSeat: -1, bidderSeat: -1, checked: [], timeLeft: 60, timerRunning: false });
  const roomRef = useRef(room);
  roomRef.current = room;
  const sbRef = useRef<Awaited<ReturnType<typeof makeSbClient>> | null>(null);
  const chanRef = useRef<ReturnType<Awaited<ReturnType<typeof makeSbClient>>['channel']> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (room.timerRunning && room.timeLeft > 0) {
      timerRef.current = setInterval(() => {
        if (mySeat === 0) {
          const next = { ...roomRef.current, timeLeft: roomRef.current.timeLeft - 1 };
          if (next.timeLeft <= 0) { next.timerRunning = false; next.phase = 'result'; }
          setRoom(next);
          chanRef.current?.send({ type: 'broadcast', event: 'state', payload: next });
        }
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [room.timerRunning]);

  const bcast = (state: OThirtyState) => chanRef.current?.send({ type: 'broadcast', event: 'state', payload: state });
  const sync = (update: Partial<OThirtyState>) => {
    const next = { ...roomRef.current, ...update };
    setRoom(next); bcast(next);
  };

  const subscribe = async (code: string, seat: 0 | 1, name: string) => {
    const sb = await makeSbClient(); sbRef.current = sb;
    if (chanRef.current) await sb.removeChannel(chanRef.current);
    const ch = sb.channel('othirty_' + code, { config: { broadcast: { self: false } } });
    chanRef.current = ch;
    ch.on('broadcast', { event: 'state' }, ({ payload }: { payload: OThirtyState }) => {
      setRoom(payload);
      if (payload.phase === 'catpick') setPhase('game');
      else if (payload.phase === 'bidding' || payload.phase === 'result') setPhase('game');
    });
    ch.on('broadcast', { event: 'join' }, ({ payload }: { payload: { name: string } }) => {
      if (seat === 0) {
        const next: OThirtyState = { ...roomRef.current, phase: 'catpick', players: [{ seat: 0, name }, { seat: 1, name: payload.name }] };
        setRoom(next); bcast(next); setPhase('game');
      }
    });
    await ch.subscribe();
    if (seat === 1) ch.send({ type: 'broadcast', event: 'join', payload: { name } });
  };

  useEffect(() => () => { sbRef.current && chanRef.current && sbRef.current.removeChannel(chanRef.current); }, []);

  useEffect(() => {
    if (!autoJoinCode || !myName.trim()) return;
    const code = autoJoinCode.toUpperCase();
    setRoomCode(code); setMySeat(1);
    subscribe(code, 1, myName.trim()).then(() => setPhase('joining'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoJoinCode]);

  useEffect(() => {
    if (!hostCode || !myName.trim()) return;
    const code = hostCode.toUpperCase();
    setRoomCode(code); setMySeat(0);
    subscribe(code, 0, myName.trim()).then(() => setPhase('creating'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostCode]);

  const create = async () => { if (!myName.trim()) { setErr('أدخل اسمك'); return; } const code = makeRoomCode(); setRoomCode(code); setMySeat(0); await subscribe(code, 0, myName.trim()); setPhase('creating'); };
  const joinRoom = async () => { if (!myName.trim()) { setErr('أدخل اسمك'); return; } if (joinCode.trim().length < 4) { setErr('أدخل الكود'); return; } const code = joinCode.trim().toUpperCase(); setRoomCode(code); setMySeat(1); await subscribe(code, 1, myName.trim()); setPhase('joining'); };

  const startBidding = async () => {
    if (!selCat) return;
    const q = await fetchThirtyQuestion(selCat).catch(() => null);
    if (!q) return;
    sync({ phase: 'bidding', catKey: selCat, question: q, bid: 1, turnSeat: 0, lastBidSeat: -1, bidderSeat: -1, checked: new Array(q.answers.length).fill(false), timeLeft: 60, timerRunning: false });
    setPhase('game');
  };

  const raiseBid = () => {
    if (roomRef.current.turnSeat !== mySeat) return;
    sync({ bid: roomRef.current.bid + 1, lastBidSeat: mySeat, turnSeat: mySeat === 0 ? 1 : 0 });
  };

  const passBid = () => {
    if (roomRef.current.turnSeat !== mySeat) return;
    const bidder = (mySeat === 0 ? 1 : 0);
    sync({ phase: 'playing', bidderSeat: bidder, timerRunning: true });
  };

  const toggleCheck = (i: number) => {
    const checked = [...roomRef.current.checked];
    checked[i] = !checked[i];
    sync({ checked });
  };

  const endPlaying = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    sync({ phase: 'result', timerRunning: false });
    setPhase('game');
  };

  const BG: React.CSSProperties = { background: '#ffffff', backgroundImage: 'radial-gradient(circle, rgba(0,27,135,0.10) 1.5px, transparent 1.5px)', backgroundSize: '20px 20px', display: 'flex', flexDirection: 'column', animation: 'fadeIn .3s ease both', direction: 'rtl', overflowY: 'auto' };

  if (phase === 'menu') return (
    <div className="screen" style={BG}>
      <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackBtn onBack={onBack} />
        <span style={{ color: '#001B87', fontWeight: 900, fontSize: 20 }}>تحدي الثلاثين — أونلاين ⏱</span>
        <span style={{ marginRight: 'auto', background: '#38E27D', color: '#001B87', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 6 }}>أونلاين</span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '0 24px', maxWidth: 440, margin: '0 auto', width: '100%' }}>
        <input value={myName} onChange={e => setMyName(e.target.value)} placeholder="اسمك"
          style={{ width: '100%', background: 'rgba(0,27,135,.07)', border: '2px solid rgba(0,27,135,.3)', borderRadius: 10, padding: '14px 16px', color: '#001B87', fontSize: 17, fontWeight: 700, outline: 'none', direction: 'rtl' }} />
        {err && <div style={{ color: '#FF3D68', fontWeight: 700, fontSize: 14 }}>{err}</div>}
        <button onClick={create} style={{ width: '100%', background: '#30E7ED', color: '#001B87', fontWeight: 900, fontSize: 18, border: 'none', borderRadius: 12, padding: '18px 0', boxShadow: '5px 5px 0 #001B87', cursor: 'pointer', clipPath: 'polygon(3% 0%, 100% 0%, 97% 100%, 0% 100%)' }}>✦ إنشاء غرفة</button>
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="كود الغرفة"
            style={{ flex: 1, background: 'rgba(0,27,135,.07)', border: '2px solid rgba(0,27,135,.3)', borderRadius: 10, padding: '14px 16px', color: '#001B87', fontSize: 18, fontWeight: 800, outline: 'none', direction: 'ltr', letterSpacing: 4, textAlign: 'center' }} />
          <button onClick={joinRoom} style={{ background: '#001B87', color: '#30E7ED', fontWeight: 900, fontSize: 16, border: '2px solid #30E7ED', borderRadius: 10, padding: '14px 22px', cursor: 'pointer' }}>انضم →</button>
        </div>
      </div>
    </div>
  );

  if (phase === 'creating') return (
    <div className="screen" style={{ ...BG, alignItems: 'center', justifyContent: 'center', gap: 28, padding: 40 }}>
      <div style={{ color: '#001B87', fontWeight: 900, fontSize: 22 }}>غرفتك جاهزة!</div>
      <div style={{ background: '#001B87', borderRadius: 20, padding: '28px 48px', textAlign: 'center' }}>
        <div style={{ color: '#30E7ED', fontWeight: 900, fontSize: 56, letterSpacing: 12, direction: 'ltr' }}>{roomCode}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#38E27D', animation: 'popIn .6s ease infinite alternate' }} />
        <span style={{ color: '#001B87', fontSize: 16, fontWeight: 700 }}>في انتظار الخصم...</span>
      </div>
      <button onClick={() => setPhase('menu')} style={{ background: 'rgba(0,27,135,.08)', color: '#001B87', fontWeight: 700, fontSize: 15, border: '1px solid rgba(0,27,135,.2)', borderRadius: 10, padding: '12px 28px', cursor: 'pointer' }}>إلغاء</button>
    </div>
  );

  if (phase === 'joining') return (
    <div className="screen" style={{ ...BG, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 40 }}>
      <div style={{ fontSize: 48, animation: 'popIn .5s ease infinite alternate' }}>🔌</div>
      <div style={{ color: '#001B87', fontWeight: 900, fontSize: 20 }}>جاري الاتصال...</div>
    </div>
  );

  // Catpick or game phases
  const isHost = mySeat === 0;
  const { question, bid, turnSeat, lastBidSeat, bidderSeat, checked, timeLeft } = room;
  const correct = checked.filter(Boolean).length;
  const won = correct >= bid;
  const myTurnBid = turnSeat === mySeat;
  const canPass = bid > 1 && lastBidSeat !== mySeat;

  if (room.phase === 'lobby' || room.phase === 'catpick') {
    const bothIn = room.players.length === 2;
    return (
      <OnlineLobby title="تحدي الثلاثين — أونلاين" roomCode={roomCode} onCancel={() => setPhase('menu')}>
        {!bothIn ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ background: '#001B87', borderRadius: 20, padding: '24px 44px', textAlign: 'center' }}>
              <div style={{ color: '#30E7ED', fontWeight: 900, fontSize: 52, letterSpacing: 10, direction: 'ltr' }}>{roomCode}</div>
            </div>
            <div style={{ color: 'rgba(0,27,135,.55)', fontSize: 15, fontWeight: 700 }}>في انتظار الخصم...</div>
          </div>
        ) : isHost ? (
          <>
            <div style={{ display: 'flex', gap: 10, padding: '14px 24px 0' }}>
              {room.players.map(p => <div key={p.seat} style={{ flex: 1, background: p.seat === 0 ? '#30E7ED' : '#001B87', color: p.seat === 0 ? '#001B87' : '#30E7ED', borderRadius: 8, padding: '8px 12px', fontWeight: 800, fontSize: 14, textAlign: 'center' }}>{p.name}</div>)}
            </div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, padding: '14px 24px 4px' }}>اختر الفئة:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '0 24px 100px' }}>
              {THIRTY_CATS_UNIQUE.map(c => (
                <button key={c} onClick={() => setSelCat(s => s === c ? null : c)} style={{
                  background: selCat === c ? '#001B87' : '#30E7ED', color: selCat === c ? '#30E7ED' : '#001B87',
                  fontWeight: 800, fontSize: 14, border: selCat === c ? '2px solid #30E7ED' : 'none',
                  borderRadius: 10, padding: '11px 18px', cursor: 'pointer',
                  boxShadow: selCat === c ? '3px 3px 0 #30E7ED' : '3px 3px 0 #001B87',
                  clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)',
                  transform: selCat === c ? 'scale(1.04)' : 'scale(1)', transition: 'all .15s',
                }}>{c}</button>
              ))}
              <button onClick={() => setSelCat('🎲')} style={{ background: selCat === '🎲' ? '#001B87' : 'rgba(0,0,0,.3)', color: selCat === '🎲' ? '#30E7ED' : '#fff', fontWeight: 800, fontSize: 14, border: selCat === '🎲' ? '2px solid #30E7ED' : '1px solid rgba(255,255,255,.2)', borderRadius: 10, padding: '11px 18px', cursor: 'pointer', clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)' }}>🎲 عشوائي</button>
            </div>
            <div style={{ position: 'fixed', bottom: 28, right: 24, transform: selCat ? 'translateX(0)' : 'translateX(120%)', transition: 'transform .35s cubic-bezier(.22,1,.36,1)', zIndex: 50 }}>
              <button onClick={startBidding} style={{ background: '#30E7ED', color: '#001B87', fontWeight: 900, fontSize: 18, border: 'none', borderRadius: 14, padding: '18px 36px', boxShadow: '6px 6px 0 #001B87', cursor: 'pointer', clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>ابدأ المزاد</span><span style={{ fontSize: 22 }}>▶</span>
              </button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ fontSize: 40, animation: 'popIn .5s ease infinite alternate' }}>⏳</div>
            <div style={{ color: '#fff', fontSize: 17, fontWeight: 700 }}>صاحب الغرفة يختار الفئة...</div>
          </div>
        )}
      </OnlineLobby>
    );
  }

  if (room.phase === 'bidding' && question) return (
    <div className="screen" style={{ ...BG, alignItems: 'center', padding: '80px 24px 24px', gap: 24 }}>
      {settingsOpen && <SettingsOverlay onClose={() => setSettingsOpen(false)} onExit={goHome} />}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: '#30E7ED', fontWeight: 900, fontSize: 18 }}>المزاد — {question.category}</span>
        <span style={{ marginRight: 'auto', background: 'rgba(0,0,0,.3)', color: '#fff', fontSize: 13, fontWeight: 800, padding: '4px 12px', borderRadius: 6, letterSpacing: 3, direction: 'ltr' }}>{roomCode}</span>
        <SettingsBtn onClick={() => setSettingsOpen(true)} />
      </div>
      <div style={{ background: 'rgba(0,0,0,.3)', borderRadius: 16, padding: '20px 24px', width: '100%', maxWidth: 540, textAlign: 'center', clipPath: 'polygon(0% 0%, 100% 2%, 98% 100%, 2% 100%)' }}>
        <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 13, marginBottom: 8 }}>{question.category}</div>
        <div style={{ color: '#fff', fontWeight: 800, fontSize: 20, lineHeight: 1.5 }}>{question.question}</div>
        {question.note && <div style={{ color: '#30E7ED', fontSize: 13, marginTop: 8 }}>ملاحظة: {question.note}</div>}
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 14 }}>عدد الإجابات</div>
        <div style={{ color: '#30E7ED', fontWeight: 900, fontSize: 80, lineHeight: 1 }}>{bid}</div>
        <div style={{ color: '#fff', fontSize: 15 }}>دور: <strong style={{ color: '#30E7ED' }}>{room.players.find(p => p.seat === turnSeat)?.name || ''}</strong>{myTurnBid ? ' (أنت)' : ''}</div>
      </div>
      <div style={{ display: 'flex', gap: 14, width: '100%', maxWidth: 400 }}>
        <button onClick={raiseBid} disabled={!myTurnBid} style={{ flex: 1, background: myTurnBid ? '#30E7ED' : 'rgba(48,231,237,.3)', color: '#001B87', fontWeight: 900, fontSize: 18, border: 'none', borderRadius: 12, padding: '18px 0', boxShadow: myTurnBid ? '5px 5px 0 #001B87' : 'none', cursor: myTurnBid ? 'pointer' : 'default', clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)' }}>+١ زيادة</button>
        <button onClick={passBid} disabled={!myTurnBid || !canPass} style={{ flex: 1, background: myTurnBid && canPass ? '#FF3D68' : 'rgba(255,61,104,.3)', color: '#fff', fontWeight: 900, fontSize: 18, border: 'none', borderRadius: 12, padding: '18px 0', boxShadow: myTurnBid && canPass ? '5px 5px 0 rgba(0,0,0,.4)' : 'none', cursor: myTurnBid && canPass ? 'pointer' : 'default', clipPath: 'polygon(0% 0%, 96% 0%, 100% 100%, 4% 100%)' }}>تمرير ✋</button>
      </div>
    </div>
  );

  if (room.phase === 'playing' && question) {
    const isBidder = bidderSeat === mySeat;
    return (
      <div className="screen" style={BG}>
        {settingsOpen && <SettingsOverlay onClose={() => setSettingsOpen(false)} onExit={goHome} />}
        <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ color: '#30E7ED', fontWeight: 900, fontSize: 16 }}>{room.players.find(p => p.seat === bidderSeat)?.name} يجيب</div>
            <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 13 }}>يجب الإجابة على {bid} إجابة</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SettingsBtn onClick={() => setSettingsOpen(true)} />
            <div style={{ background: timeLeft <= 10 ? '#FF3D68' : '#001B87', color: '#fff', fontWeight: 900, fontSize: 34, borderRadius: 12, padding: '8px 18px', boxShadow: '4px 4px 0 rgba(0,0,0,.4)', minWidth: 70, textAlign: 'center' }}>{timeLeft}s</div>
          </div>
        </div>
        <div style={{ padding: '16px 24px', width: '100%' }}>
          <div style={{ background: 'rgba(0,0,0,.25)', borderRadius: 12, padding: '14px 18px', marginBottom: 14, textAlign: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 12, marginBottom: 4 }}>{question.category}</div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 17 }}>{question.question}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#30E7ED', fontWeight: 700, marginBottom: 10, fontSize: 14 }}>
            <span>✅ {correct} / {bid}</span>
            <span>{question.answers.length} إجابة ممكنة</span>
          </div>
          {/* Only the NON-bidder (judge) can tap answers; bidder just watches */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {question.answers.map((a, i) => (
              <button key={i} onClick={() => !isBidder && toggleCheck(i)} style={{
                background: checked[i] ? '#38E27D' : 'rgba(0,0,0,.3)',
                color: checked[i] ? '#001B87' : '#fff',
                border: checked[i] ? 'none' : '1px solid rgba(255,255,255,.2)',
                borderRadius: 8, padding: '10px 16px', fontWeight: 700, fontSize: 15,
                cursor: !isBidder ? 'pointer' : 'default',
                boxShadow: checked[i] ? '3px 3px 0 rgba(0,0,0,.3)' : 'none', transition: 'all .15s',
              }}>{checked[i] ? '✓ ' : ''}{a}</button>
            ))}
          </div>
        </div>
        {!isBidder && (
          <div style={{ padding: '0 24px', width: '100%' }}>
            <button onClick={endPlaying} style={{ width: '100%', background: won ? '#38E27D' : '#FF3D68', color: '#fff', fontWeight: 900, fontSize: 18, border: 'none', borderRadius: 12, padding: '16px 0', boxShadow: '5px 5px 0 rgba(0,0,0,.3)', cursor: 'pointer', clipPath: 'polygon(2% 0%, 100% 0%, 98% 100%, 0% 100%)' }}>إنهاء الجولة</button>
          </div>
        )}
        {isBidder && <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 14, textAlign: 'center', padding: '0 24px' }}>قُلِ الإجابات بصوت عالٍ — خصمك يعلّمها</div>}
      </div>
    );
  }

  if (room.phase === 'result' && question) {
    const bidderName = room.players.find(p => p.seat === bidderSeat)?.name || '';
    return (
      <div className="screen" style={{ ...BG, alignItems: 'center', justifyContent: 'center', gap: 24, padding: '40px 24px' }}>
        <div style={{ fontSize: 80, animation: 'popIn .4s ease both' }}>{won ? '🏆' : '💥'}</div>
        <div style={{ color: won ? '#38E27D' : '#FF3D68', fontWeight: 900, fontSize: 34, textAlign: 'center' }}>{won ? 'أحسنت!' : 'انتهى الوقت!'}</div>
        <div style={{ color: '#fff', fontSize: 17, textAlign: 'center' }}>{bidderName} أجاب على <strong style={{ color: '#30E7ED' }}>{correct}</strong> من أصل <strong>{bid}</strong></div>
        <div style={{ background: 'rgba(0,0,0,.3)', borderRadius: 14, padding: '18px 24px', width: '100%', maxWidth: 480 }}>
          <div style={{ color: '#30E7ED', fontWeight: 800, marginBottom: 12, fontSize: 15 }}>جميع الإجابات:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {question.answers.map((a, i) => (
              <span key={i} style={{ background: checked[i] ? '#38E27D' : 'rgba(255,61,104,.3)', color: '#fff', borderRadius: 8, padding: '6px 14px', fontSize: 14, fontWeight: 700 }}>{a}</span>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          {isHost && <button onClick={() => { sync({ phase: 'catpick', question: undefined, bid: 1, turnSeat: 0, lastBidSeat: -1, bidderSeat: -1, checked: [], timeLeft: 60, timerRunning: false }); setSelCat(null); }} style={{ background: '#30E7ED', color: '#001B87', fontWeight: 900, fontSize: 16, border: 'none', borderRadius: 12, padding: '14px 32px', boxShadow: '5px 5px 0 #001B87', cursor: 'pointer', clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)' }}>جولة جديدة ↺</button>}
          <button onClick={() => setPhase('menu')} style={{ background: 'rgba(255,255,255,.1)', color: '#fff', fontWeight: 700, fontSize: 16, border: '2px solid rgba(255,255,255,.2)', borderRadius: 12, padding: '14px 28px', cursor: 'pointer' }}>القائمة</button>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Root ─────────────────────────────────────────────
