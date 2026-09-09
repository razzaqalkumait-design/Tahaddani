import { BackBtn } from '../components/BackBtn';
import { GuessCard } from '../components/GuessCard';
import { SettingsBtn, SettingsOverlay } from '../components/SettingsOverlay';
import { AccountCtx } from '../contexts/AccountContext';
import { NavCtx } from '../contexts/NavContext';
import { makeSbClient } from '../online/helpers';
import { dealGuessCards, fetchGuessCategories } from '../api';
import { supabase } from '../supabase';
import { useContext, useEffect, useRef, useState } from 'react';
import type { GuessCard, GuessCategory } from '../api';

export function GuessSetupStub({ onBack, autoJoinCode, hostCode }: { onBack: () => void; autoJoinCode?: string; hostCode?: string }) {
  const sbRef = useRef<typeof supabase | null>(null);
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  type OnlinePhase = 'menu' | 'creating' | 'joining' | 'lobby' | 'catpick' | 'playing' | 'result';

  interface RoomState {
    phase: 'lobby' | 'catpick' | 'playing' | 'result';
    catKey?: string;
    cards?: [{ name: string; file: string }, { name: string; file: string }];
    scores: [number, number];
    currentRound: number;
    qCount: [number, number];
    guessing?: number;
    roundHistory: { winner: number; q: [number, number] }[];
    players: { seat: number; name: string }[];
  }

  const { account: guessAccount } = useContext(AccountCtx);
  const [phase, setPhase] = useState<OnlinePhase>('menu');
  const [myName, setMyName] = useState(() => guessAccount?.name ?? '');
  const [guessCats, setGuessCats] = useState<GuessCategory[]>([]);
  const [catsLoading, setCatsLoading] = useState(true);
  useEffect(() => {
    fetchGuessCategories().then(cats => { setGuessCats(cats); setCatsLoading(false); }).catch(() => setCatsLoading(false));
  }, []);
  const [joinCode, setJoinCode] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mySeat, setMySeat] = useState<0 | 1>(0);
  const [room, setRoom] = useState<RoomState>({ phase: 'lobby', players: [], scores: [0, 0], currentRound: 0, qCount: [0, 0], roundHistory: [] });
  const [catSel, setCatSel] = useState<GuessCategory | null>(null);
  const [err, setErr] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { goHome } = useContext(NavCtx);
  const roomRef = useRef<RoomState>(room);
  roomRef.current = room;

  const BG: React.CSSProperties = {
    background: '#ffffff',
    backgroundImage: 'radial-gradient(circle, rgba(0,27,135,0.10) 1.5px, transparent 1.5px)',
    backgroundSize: '20px 20px',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'flex-start', padding: '0 0 40px', direction: 'rtl',
    animation: 'fadeIn .3s ease both', overflowY: 'auto',
  };
  const PlayNow = ({ onClick, show }: { onClick: () => void; show: boolean }) => (
    <div style={{ position: 'fixed', bottom: 28, right: 24, transform: show ? 'translateX(0)' : 'translateX(120%)', transition: 'transform .35s cubic-bezier(.22,1,.36,1)', zIndex: 50 }}>
      <button onClick={onClick} style={{ background: '#30E7ED', color: '#001B87', fontWeight: 900, fontSize: 18, border: 'none', borderRadius: 14, padding: '18px 36px', boxShadow: '6px 6px 0 #001B87', cursor: 'pointer', clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span>العب الآن</span><span style={{ fontSize: 22 }}>▶</span>
      </button>
    </div>
  );

  const broadcast = (event: string, payload: object) => {
    if (chanRef.current) chanRef.current.send({ type: 'broadcast', event, payload });
  };

  const syncRoom = (update: Partial<RoomState>) => {
    const next = { ...roomRef.current, ...update };
    setRoom(next);
    broadcast('state', next);
  };

  const subscribeChannel = async (code: string, seat: 0 | 1, name: string) => {
    const sb = await makeSbClient(); sbRef.current = sb;
    if (chanRef.current) { await sb.removeChannel(chanRef.current); chanRef.current = null; }
    const ch = sb.channel('guess_room_' + code, { config: { broadcast: { self: false } } });
    chanRef.current = ch;

    ch.on('broadcast', { event: 'state' }, ({ payload }: { payload: RoomState }) => {
      const safe: RoomState = {
        phase: payload.phase, catKey: payload.catKey, cards: payload.cards, guessing: payload.guessing,
        players: payload.players ?? [],
        scores: payload.scores ?? [0, 0],
        currentRound: payload.currentRound ?? 0,
        qCount: payload.qCount ?? [0, 0],
        roundHistory: payload.roundHistory ?? [],
      };
      setRoom(safe);
      if (payload.phase === 'catpick' || payload.phase === 'playing' || payload.phase === 'result') {
        setPhase('lobby');
      }
    });

    ch.on('broadcast', { event: 'join' }, ({ payload }: { payload: { name: string } }) => {
      if (seat === 0) {
        const next: RoomState = {
          ...roomRef.current,
          phase: 'catpick',
          players: [{ seat: 0, name: name }, { seat: 1, name: payload.name }],
        };
        setRoom(next);
        broadcast('state', next);
        setPhase('lobby');
      }
    });

    await ch.subscribe();

    if (seat === 1) {
      // Guest announces join after subscribe
      ch.send({ type: 'broadcast', event: 'join', payload: { name } });
    }
  };

  useEffect(() => {
    return () => {
      if (sbRef.current && chanRef.current) sbRef.current.removeChannel(chanRef.current);
    };
  }, []);

  // auto-join when launched from a friend invite
  useEffect(() => {
    if (!autoJoinCode || !myName.trim()) return;
    const code = autoJoinCode.toUpperCase();
    setRoomCode(code);
    setMySeat(1);
    subscribeChannel(code, 1, myName.trim()).then(() => setPhase('joining'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoJoinCode]);

  useEffect(() => {
    if (!hostCode || !myName.trim()) return;
    const code = hostCode.toUpperCase();
    setRoomCode(code);
    setMySeat(0);
    subscribeChannel(code, 0, myName.trim()).then(() => setPhase('creating'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostCode]);

  const makeCode = () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    .split('').sort(() => Math.random() - .5).slice(0, 6).join('');

  const createRoom = async () => {
    if (!myName.trim()) { setErr('أدخل اسمك أولاً'); return; }
    const code = makeCode();
    setRoomCode(code);
    setMySeat(0);
    await subscribeChannel(code, 0, myName.trim());
    setPhase('creating');
  };

  const joinRoom = async () => {
    if (!myName.trim()) { setErr('أدخل اسمك أولاً'); return; }
    if (joinCode.trim().length < 4) { setErr('أدخل الكود كاملاً'); return; }
    const code = joinCode.trim().toUpperCase();
    setRoomCode(code);
    setMySeat(1);
    await subscribeChannel(code, 1, myName.trim());
    setPhase('joining');
  };

  const dealCards = async (catKey: string): Promise<[GuessCard, GuessCard] | null> => {
    try { return await dealGuessCards(catKey); } catch { return null; }
  };

  const dealAndStart = async () => {
    if (!catSel) return;
    const cards = await dealCards(catSel.key);
    if (!cards) return;
    syncRoom({ phase: 'playing', catKey: catSel.key, cards, scores: [0, 0], currentRound: 0, qCount: [0, 0], roundHistory: [] });
    setPhase('playing');
  };

  const addQuestion = () => {
    const q: [number, number] = [...roomRef.current.qCount] as [number, number];
    q[mySeat] = q[mySeat] + 1;
    syncRoom({ qCount: q });
  };

  const declareGuess = () => {
    syncRoom({ guessing: mySeat });
  };

  const confirmGuess = async (correct: boolean) => {
    if (mySeat !== 0) return;
    const cur = roomRef.current;
    const guesser = cur.guessing as 0 | 1;
    if (!correct) { syncRoom({ guessing: undefined }); return; }
    const newScores: [number, number] = [cur.scores[0], cur.scores[1]];
    newScores[guesser] = newScores[guesser] + 1;
    const newHistory = [...cur.roundHistory, { winner: guesser, q: [cur.qCount[0], cur.qCount[1]] as [number, number] }];
    if (newScores[guesser] >= 2) {
      syncRoom({ phase: 'result', scores: newScores, roundHistory: newHistory, guessing: undefined });
    } else {
      const cards = cur.catKey ? await dealCards(cur.catKey) : null;
      if (!cards) return;
      syncRoom({ cards, scores: newScores, currentRound: cur.currentRound + 1, qCount: [0, 0], roundHistory: newHistory, guessing: undefined });
    }
  };

  // ── Menu ────────────────────────────────────────────
  if (phase === 'menu') return (
    <div className="screen" style={BG}>
      <div style={{ width: '100%', padding: '20px 24px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackBtn onBack={onBack} />
        <span style={{ color: '#001B87', fontWeight: 900, fontSize: 22 }}>خمّن أسرع</span>
        <span style={{ marginRight: 'auto', background: '#38E27D', color: '#001B87', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 6 }}>أونلاين</span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, width: '100%', maxWidth: 440, padding: '0 24px' }}>
        <div style={{ color: 'rgba(0,27,135,.6)', textAlign: 'center', fontSize: 15, lineHeight: 1.8 }}>
          كل لاعب يرى بطاقته الخاصة — بطاقتك هي ما يحاول خصمك تخمينه!<br />اسأل أسئلة بنعم/لا لتعرف بطاقة خصمك.
        </div>
        <input value={myName} onChange={e => setMyName(e.target.value)} placeholder="اسمك"
          style={{ width: '100%', background: 'rgba(0,27,135,.07)', border: '2px solid rgba(0,27,135,.3)', borderRadius: 10, padding: '14px 16px', color: '#001B87', fontSize: 17, fontWeight: 700, outline: 'none', direction: 'rtl' }} />
        {err && <div style={{ color: '#FF3D68', fontWeight: 700, fontSize: 14 }}>{err}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
          <button onClick={createRoom} style={{ background: '#30E7ED', color: '#001B87', fontWeight: 900, fontSize: 18, border: 'none', borderRadius: 12, padding: '18px 0', boxShadow: '5px 5px 0 #001B87', cursor: 'pointer', clipPath: 'polygon(3% 0%, 100% 0%, 97% 100%, 0% 100%)', width: '100%' }}>
            ✦ إنشاء غرفة جديدة
          </button>
          <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
            <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="كود الغرفة"
              style={{ flex: 1, background: 'rgba(0,27,135,.07)', border: '2px solid rgba(0,27,135,.3)', borderRadius: 10, padding: '14px 16px', color: '#001B87', fontSize: 18, fontWeight: 800, outline: 'none', direction: 'ltr', letterSpacing: 4, textAlign: 'center' }} />
            <button onClick={joinRoom} style={{ background: '#001B87', color: '#30E7ED', fontWeight: 900, fontSize: 16, border: '2px solid #30E7ED', borderRadius: 10, padding: '14px 22px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              انضم →
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Creating (waiting for opponent) ─────────────────
  if (phase === 'creating') return (
    <div className="screen" style={{ ...BG, justifyContent: 'center', gap: 28, padding: 40 }}>
      <div style={{ color: '#001B87', fontWeight: 900, fontSize: 22, textAlign: 'center' }}>غرفتك جاهزة!</div>
      <div style={{ background: '#001B87', borderRadius: 20, padding: '28px 48px', textAlign: 'center', clipPath: 'polygon(0% 0%, 100% 3%, 97% 100%, 0% 100%)' }}>
        <div style={{ color: 'rgba(255,255,255,.55)', fontSize: 14, marginBottom: 8 }}>الكود</div>
        <div style={{ color: '#30E7ED', fontWeight: 900, fontSize: 56, letterSpacing: 12, direction: 'ltr' }}>{roomCode}</div>
        <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 13, marginTop: 8 }}>شارك الكود مع خصمك</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#38E27D', animation: 'popIn .6s ease infinite alternate' }} />
        <span style={{ color: '#001B87', fontSize: 16, fontWeight: 700 }}>في انتظار الخصم...</span>
      </div>
      <button onClick={() => { setPhase('menu'); }} style={{ background: 'rgba(0,27,135,.08)', color: '#001B87', fontWeight: 700, fontSize: 15, border: '1px solid rgba(0,27,135,.2)', borderRadius: 10, padding: '12px 28px', cursor: 'pointer' }}>إلغاء</button>
    </div>
  );

  // ── Joining (waiting for sync) ───────────────────────
  if (phase === 'joining') return (
    <div className="screen" style={{ ...BG, justifyContent: 'center', gap: 20, padding: 40 }}>
      <div style={{ fontSize: 48, animation: 'popIn .5s ease infinite alternate' }}>🔌</div>
      <div style={{ color: '#001B87', fontWeight: 900, fontSize: 20 }}>جاري الاتصال...</div>
      <div style={{ color: 'rgba(0,27,135,.55)', fontSize: 15 }}>كود الغرفة: <strong style={{ letterSpacing: 4 }}>{roomCode}</strong></div>
    </div>
  );

  // ── Lobby / Catpick ──────────────────────────────────
  if (room.phase === 'lobby' || room.phase === 'catpick') {
    const bothIn = room.players.length === 2;
    const isHost = mySeat === 0;
    return (
      <div className="screen" style={BG}>
        <div style={{ width: '100%', padding: '20px 24px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <BackBtn onBack={() => setPhase('menu')} />
          <span style={{ color: '#001B87', fontWeight: 900, fontSize: 20 }}>خمّن أسرع — {roomCode}</span>
        </div>

        {bothIn && (
          <div style={{ display: 'flex', gap: 10, padding: '16px 24px 0', width: '100%', maxWidth: 500 }}>
            {room.players.map(p => (
              <div key={p.seat} style={{ flex: 1, background: p.seat === mySeat ? '#30E7ED' : '#001B87', color: p.seat === mySeat ? '#001B87' : '#30E7ED', borderRadius: 10, padding: '10px 14px', fontWeight: 800, fontSize: 15, clipPath: p.seat === 0 ? 'polygon(0% 0%, 100% 3%, 97% 100%, 0% 100%)' : 'polygon(3% 0%, 100% 0%, 100% 97%, 0% 100%)' }}>
                {p.name} {p.seat === mySeat ? '(أنت)' : '(خصمك)'}
              </div>
            ))}
          </div>
        )}

        {!bothIn && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            <div style={{ background: 'rgba(0,0,0,.35)', borderRadius: 20, padding: '24px 44px', textAlign: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 14, marginBottom: 6 }}>الكود</div>
              <div style={{ color: '#30E7ED', fontWeight: 900, fontSize: 52, letterSpacing: 10, direction: 'ltr' }}>{roomCode}</div>
            </div>
            <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 15 }}>في انتظار الخصم...</div>
          </div>
        )}

        {bothIn && isHost && room.phase === 'catpick' && (
          <>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, padding: '20px 24px 0', width: '100%', maxWidth: 500 }}>اختر الفئة:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 24px 100px', width: '100%', maxWidth: 500 }}>
              {catsLoading && <div style={{ color: 'rgba(0,27,135,.5)', textAlign: 'center', padding: 20 }}>جارٍ التحميل...</div>}
              {guessCats.map((c, i) => (
                <button key={c.key} onClick={() => setCatSel(cc => cc?.key === c.key ? null : c)} style={{
                  background: catSel?.key === c.key ? '#001B87' : '#30E7ED',
                  color: catSel?.key === c.key ? '#30E7ED' : '#001B87',
                  fontWeight: 800, fontSize: 17, border: catSel?.key === c.key ? '2px solid #30E7ED' : 'none',
                  borderRadius: 12, padding: '16px 20px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 14,
                  boxShadow: catSel?.key === c.key ? '4px 4px 0 #30E7ED' : '4px 4px 0 #001B87',
                  clipPath: i % 2 === 0 ? 'polygon(0% 0%, 100% 2%, 98% 100%, 0% 100%)' : 'polygon(2% 0%, 100% 0%, 100% 98%, 0% 100%)',
                  transform: catSel?.key === c.key ? 'scale(1.03)' : 'scale(1)', transition: 'all .15s',
                }}>
                  <img
                    src={`/images/guess/cat/${c.key}.png`}
                    alt={c.emoji}
                    style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }}
                    onError={e => { const t = e.target as HTMLImageElement; t.style.display = 'none'; t.insertAdjacentText('afterend', c.emoji); }}
                  />
                  <span>{c.name}</span>
                  <span style={{ marginRight: 'auto', opacity: 0.45, fontSize: 13 }}>{c.count} شخصية</span>
                </button>
              ))}
            </div>
            <PlayNow show={!!catSel} onClick={dealAndStart} />
          </>
        )}

        {bothIn && !isHost && room.phase === 'catpick' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ fontSize: 40, animation: 'popIn .5s ease infinite alternate' }}>⏳</div>
            <div style={{ color: '#fff', fontSize: 17, fontWeight: 700 }}>صاحب الغرفة يختار الفئة...</div>
          </div>
        )}
      </div>
    );
  }

  // ── Playing ─────────────────────────────────────────
  if (room.phase === 'playing' && room.cards) {
    const myCard = room.cards[mySeat];
    const cat = guessCats.find(c => c.key === room.catKey);
    const isHost = mySeat === 0;
    const guessingSeat = room.guessing;
    const players = room.players ?? [];
    const scores: [number, number] = room.scores ?? [0, 0];
    const qCount: [number, number] = room.qCount ?? [0, 0];
    const roundHistory = room.roundHistory ?? [];
    const currentRound = room.currentRound ?? 0;

    return (
      <div className="screen" style={{ background: '#ffffff', backgroundImage: 'radial-gradient(circle, rgba(0,27,135,0.10) 1.5px, transparent 1.5px)', backgroundSize: '20px 20px', display: 'flex', flexDirection: 'row', direction: 'rtl', animation: 'fadeIn .3s ease both', overflow: 'hidden' }}>
        {settingsOpen && <SettingsOverlay onClose={() => setSettingsOpen(false)} onExit={goHome} />}
        <div style={{ position: 'fixed', top: 8, bottom: 345, right: 8, zIndex: 20 }}><SettingsBtn onClick={() => setSettingsOpen(true)} /></div>

        {/* ── LEFT PANEL — navy stats ── */}
        <div style={{ width: '42%', background: '#001B87', clipPath: 'polygon(0% 0%, 100% 0%, 92% 100%, 0% 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12, padding: '16px 28px 16px 18px' }}>

          {/* Round indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'rgba(255,255,255,.45)', fontSize: 11, fontWeight: 700 }}>الجولة</span>
            <div style={{ display: 'flex', gap: 5 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: i < currentRound ? '#38E27D' : i === currentRound ? '#30E7ED' : 'rgba(255,255,255,.18)', boxShadow: i === currentRound ? '0 0 0 3px rgba(48,231,237,.2)' : 'none', transition: 'background .3s' }} />
              ))}
            </div>
          </div>

          {/* Scores — cyan chips */}
          <div style={{ display: 'flex', gap: 8 }}>
            {players.map(p => (
              <div key={p.seat} style={{ flex: 1, background: '#30E7ED', borderRadius: 10, padding: '8px 12px', clipPath: p.seat === 0 ? 'polygon(0% 0%, 100% 0%, 94% 100%, 0% 100%)' : 'polygon(6% 0%, 100% 0%, 100% 100%, 0% 100%)', boxShadow: '3px 3px 0 rgba(0,0,0,.25)' }}>
                <div style={{ color: '#001B87', fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 32, lineHeight: 1 }}>{scores[p.seat]}</div>
                <div style={{ color: 'rgba(0,27,135,.6)', fontSize: 11, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.seat === mySeat ? 'أنت' : p.name}</div>
              </div>
            ))}
          </div>

          {/* Q counters */}
          <div style={{ background: 'rgba(255,255,255,.07)', borderRadius: 10, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ color: '#30E7ED', fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>عدد الأسئلة</div>
            {players.map(p => (
              <div key={p.seat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ color: p.seat === mySeat ? '#30E7ED' : 'rgba(255,255,255,.7)', fontWeight: 700, fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.seat === mySeat ? 'أنت' : p.name}
                </div>
                <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 20, color: '#fff', minWidth: 28, textAlign: 'center' }}>{qCount[p.seat]}</div>
                {p.seat === mySeat && (
                  <button onClick={addQuestion} style={{ background: '#30E7ED', color: '#001B87', fontWeight: 900, fontSize: 13, border: 'none', borderRadius: 6, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '2px 2px 0 rgba(0,0,0,.3)' }}>+</button>
                )}
              </div>
            ))}
          </div>

          {/* Round history */}
          {roundHistory.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ color: 'rgba(255,255,255,.35)', fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>سجل الجولات</div>
              {roundHistory.map((r, i) => {
                const wName = players.find(p => p.seat === r.winner)?.name || '';
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(48,231,237,.08)', borderRadius: 6, padding: '4px 8px' }}>
                    <span style={{ color: 'rgba(255,255,255,.3)', fontSize: 10 }}>ج{i + 1}</span>
                    <span style={{ color: '#38E27D', fontWeight: 700, fontSize: 11, flex: 1 }}>{r.winner === mySeat ? 'أنت' : wName}</span>
                    <span style={{ color: 'rgba(255,255,255,.25)', fontSize: 10 }}>{r.q[0]}س/{r.q[1]}س</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL — card ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 20px', position: 'relative', gap: 12 }}>
          {/* Turn indicator */}
          {(() => {
            const askingSeat = qCount[0] <= qCount[1] ? 0 : 1;
            const isMyTurn = askingSeat === mySeat;
            const askingName = players.find(p => p.seat === askingSeat)?.name || '';
            return (
              <div style={{ alignSelf: 'stretch', background: isMyTurn ? '#30E7ED' : '#001B87', borderRadius: 8, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8, boxShadow: isMyTurn ? '3px 3px 0 #001B87' : '3px 3px 0 #30E7ED', clipPath: 'polygon(0% 0%, 100% 0%, 97% 100%, 0% 100%)', animation: 'popIn .3s ease both' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: isMyTurn ? '#001B87' : '#30E7ED', flexShrink: 0, animation: 'urgentPulse 1s ease-in-out infinite' }} />
                <span style={{ fontWeight: 800, fontSize: 13, color: isMyTurn ? '#001B87' : '#30E7ED' }}>
                  {isMyTurn ? 'دورك للسؤال' : `دور ${askingName} للسؤال`}
                </span>
              </div>
            );
          })()}
          <div style={{ color: 'rgba(0,27,135,.4)', fontSize: 11, fontWeight: 700, alignSelf: 'flex-start' }}>بطاقتك ← يحاول خصمك تخمينها</div>

          {/* Card */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ height: '100%', maxHeight: 220, aspectRatio: '3/4', borderRadius: 14, overflow: 'hidden', boxShadow: '6px 6px 0 #001B87', position: 'relative', background: '#e8eeff' }}>
              {(() => {
                const src = cat ? `/images/guess/${cat.key}/${myCard.file}` : '';
                return <img src={src} alt={myCard.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />;
              })()}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,27,135,.9))', padding: '18px 10px 10px', textAlign: 'center' }}>
                <div style={{ color: '#fff', fontWeight: 900, fontSize: 15, textShadow: '0 2px 6px rgba(0,0,0,.6)' }}>{myCard.name}</div>
              </div>
            </div>
          </div>

          {/* I know / waiting */}
          {guessingSeat == null ? (
            <button onClick={declareGuess} style={{ width: '100%', background: '#30E7ED', color: '#001B87', fontWeight: 900, fontSize: 17, border: 'none', borderRadius: 12, padding: '14px 0', boxShadow: '4px 4px 0 #001B87', cursor: 'pointer', clipPath: 'polygon(3% 0%, 100% 0%, 97% 100%, 0% 100%)' }}>
              🎯 أنا عارف!
            </button>
          ) : (
            <div style={{ textAlign: 'center', padding: '10px 0', color: guessingSeat === mySeat ? '#001B87' : '#001B87', fontWeight: 700, fontSize: 14 }}>
              {guessingSeat === mySeat ? '⏳ في انتظار تأكيد المضيف...' : `🎯 ${players.find(p => p.seat === guessingSeat)?.name} يعتقد أنه يعرف!`}
            </div>
          )}

          {/* Host confirmation overlay */}
          {guessingSeat != null && isHost && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,27,135,.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
              <div style={{ color: '#30E7ED', fontWeight: 900, fontSize: 18, textAlign: 'center' }}>
                {guessingSeat === mySeat ? 'هل خمّنت صح؟' : `هل ${players.find(p => p.seat === guessingSeat)?.name} خمّن صح؟`}
              </div>
              <div style={{ color: 'rgba(255,255,255,.45)', fontSize: 13, textAlign: 'center' }}>تحقق شفهياً من الإجابة</div>
              <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                <button onClick={() => confirmGuess(true)} style={{ flex: 1, background: '#38E27D', color: '#001B87', fontWeight: 900, fontSize: 18, border: 'none', borderRadius: 10, padding: '16px 0', cursor: 'pointer', clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)', boxShadow: '4px 4px 0 rgba(0,0,0,.3)' }}>صح ✓</button>
                <button onClick={() => confirmGuess(false)} style={{ flex: 1, background: '#FF3D68', color: '#fff', fontWeight: 900, fontSize: 18, border: 'none', borderRadius: 10, padding: '16px 0', cursor: 'pointer', clipPath: 'polygon(0% 0%, 96% 0%, 100% 100%, 4% 100%)', boxShadow: '4px 4px 0 rgba(0,0,0,.3)' }}>غلط ✗</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Result ──────────────────────────────────────────
  if (room.phase === 'result') {
    const winnerSeat = room.scores[0] >= 2 ? 0 : 1;
    const won = winnerSeat === mySeat;
    const winnerName = room.players.find(p => p.seat === winnerSeat)?.name || '';
    const cat = guessCats.find(c => c.key === room.catKey);
    return (
      <div className="screen" style={{ ...BG, justifyContent: 'center', gap: 22, padding: '40px 24px' }}>
        <div style={{ fontSize: 72, animation: 'popIn .4s ease both' }}>{won ? '🏆' : '💥'}</div>
        <div style={{ color: won ? '#38E27D' : '#FF3D68', fontWeight: 900, fontSize: 32, textAlign: 'center' }}>
          {won ? 'أنت الفائز!' : `${winnerName} فاز!`}
        </div>

        {/* Final score */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          {room.players.map(p => (
            <div key={p.seat} style={{ textAlign: 'center', background: 'rgba(0,0,0,.3)', borderRadius: 14, padding: '16px 28px', clipPath: p.seat === 0 ? 'polygon(0% 0%, 100% 3%, 97% 100%, 0% 100%)' : 'polygon(3% 0%, 100% 0%, 100% 97%, 0% 100%)' }}>
              <div style={{ color: '#38E27D', fontWeight: 900, fontSize: 40 }}>{room.scores[p.seat]}</div>
              <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 13 }}>{p.seat === mySeat ? 'أنت' : p.name}</div>
            </div>
          ))}
        </div>

        {/* Cards reveal */}
        {room.cards && cat && (
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
            {room.cards.map((card, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <GuessCard item={card} catKey={cat.key} revealed={true} />
                <div style={{ color: '#30E7ED', fontSize: 12, marginTop: 8 }}>بطاقة {room.players.find(p => p.seat === i)?.name}</div>
              </div>
            ))}
          </div>
        )}

        {/* Round history */}
        {room.roundHistory.length > 0 && (
          <div style={{ width: '100%', maxWidth: 400, background: 'rgba(0,0,0,.2)', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ color: '#30E7ED', fontWeight: 700, fontSize: 12, marginBottom: 10, letterSpacing: 1 }}>نتائج الجولات</div>
            {room.roundHistory.map((r, i) => {
              const wName = room.players.find(p => p.seat === r.winner)?.name || '';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                  <span style={{ color: 'rgba(255,255,255,.35)', fontSize: 12 }}>جولة {i + 1}</span>
                  <span style={{ color: '#38E27D', fontWeight: 700, flex: 1 }}>{r.winner === mySeat ? 'أنت' : wName}</span>
                  <span style={{ color: 'rgba(255,255,255,.3)', fontSize: 11 }}>{r.q[0]}س / {r.q[1]}س</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Sliding "play again" button */}
        <div style={{ position: 'fixed', bottom: 28, left: 24, transform: 'translateX(0)', animation: 'slideRight .45s cubic-bezier(.22,1,.36,1) .2s both', zIndex: 50 }}>
          {mySeat === 0 ? (
            <button onClick={() => { syncRoom({ phase: 'catpick', cards: undefined, scores: [0, 0], currentRound: 0, qCount: [0, 0], roundHistory: [], guessing: undefined }); setCatSel(null); }} style={{
              background: '#001B87', color: '#30E7ED', border: 'none', borderRadius: 6, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 13, padding: '14px 31px',
              boxShadow: '5.5px 5.5px 0 #30E7ED',
            }}>
              <span style={{ fontFamily: "'Tajawal:Black',sans-serif", fontWeight: 900, fontSize: 21, color: '#30E7ED' }}>العب مجدداً</span>
              <span style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 22, color: '#30E7ED', lineHeight: 1 }}>→</span>
            </button>
          ) : (
            <button onClick={() => setPhase('menu')} style={{
              background: '#001B87', color: '#30E7ED', border: 'none', borderRadius: 6, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 13, padding: '14px 31px',
              boxShadow: '5.5px 5.5px 0 #30E7ED',
            }}>
              <span style={{ fontFamily: "'Tajawal:Black',sans-serif", fontWeight: 900, fontSize: 21, color: '#30E7ED' }}>القائمة</span>
              <span style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 22, color: '#30E7ED', lineHeight: 1 }}>→</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}


