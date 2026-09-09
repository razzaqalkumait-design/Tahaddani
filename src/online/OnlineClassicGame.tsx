import { BackBtn } from '../components/BackBtn';
import { CatImage } from '../components/CatImage';
import { SettingsBtn, SettingsOverlay } from '../components/SettingsOverlay';
import { AccountCtx } from '../contexts/AccountContext';
import { NavCtx } from '../contexts/NavContext';
import { OnlineLobby } from './OnlineLobby';
import { makeRoomCode, makeSbClient } from './helpers';
import { TIERS } from '../screenTypes';
import { pickQuestion, playableGroups } from '../data';
import { useContext, useEffect, useRef, useState } from 'react';
import type { Question } from '../types';

// ─── Online Classic / Wicked ──────────────────────────
export type OClassicPhase = 'menu' | 'creating' | 'joining' | 'game' | 'result';
export interface OClassicState {
  phase: 'lobby' | 'catpick' | 'game' | 'result';
  wicked: boolean;
  players: { seat: number; name: string }[];
  cats: string[];
  usedCells: string[];
  current: { group: string; tier: number; q: { question: string; answer: string } } | null;
  showAnswer: boolean;
  activeSeat: number;
  scores: [number, number];
}

export function OnlineClassicGame({ wicked, onBack, autoJoinCode, hostCode }: { wicked: boolean; onBack: () => void; autoJoinCode?: string; hostCode?: string }) {
  const [phase, setPhase] = useState<OClassicPhase>('menu');
  const { account: classicAccount } = useContext(AccountCtx);
  const [myName, setMyName] = useState(() => classicAccount?.name ?? '');
  const [joinCode, setJoinCode] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mySeat, setMySeat] = useState<0 | 1>(0);
  const [err, setErr] = useState('');
  const [selCats, setSelCats] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { goHome } = useContext(NavCtx);
  const [room, setRoom] = useState<OClassicState>({
    phase: 'lobby', wicked, players: [], cats: [], usedCells: [], current: null, showAnswer: false, activeSeat: 0, scores: [0, 0],
  });
  const roomRef = useRef(room);
  roomRef.current = room;
  const sbRef = useRef<Awaited<ReturnType<typeof makeSbClient>> | null>(null);
  const chanRef = useRef<ReturnType<Awaited<ReturnType<typeof makeSbClient>>['channel']> | null>(null);

  const bcast = (state: OClassicState) => {
    chanRef.current?.send({ type: 'broadcast', event: 'state', payload: state });
  };
  const sync = (update: Partial<OClassicState>) => {
    const next = { ...roomRef.current, ...update };
    setRoom(next);
    bcast(next);
  };

  const subscribe = async (code: string, seat: 0 | 1, name: string) => {
    const sb = await makeSbClient();
    sbRef.current = sb;
    if (chanRef.current) { await sb.removeChannel(chanRef.current); }
    const ch = sb.channel('oclassic_' + code, { config: { broadcast: { self: false } } });
    chanRef.current = ch;
    ch.on('broadcast', { event: 'state' }, ({ payload }: { payload: OClassicState }) => {
      setRoom(payload);
      if (payload.phase === 'catpick' || payload.phase === 'game') setPhase('game');
    });
    ch.on('broadcast', { event: 'join' }, ({ payload }: { payload: { name: string } }) => {
      if (seat === 0) {
        const next: OClassicState = { ...roomRef.current, phase: 'catpick', players: [{ seat: 0, name }, { seat: 1, name: payload.name }] };
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

  const create = async () => {
    if (!myName.trim()) { setErr('أدخل اسمك'); return; }
    const code = makeRoomCode(); setRoomCode(code); setMySeat(0);
    await subscribe(code, 0, myName.trim()); setPhase('creating');
  };
  const join = async () => {
    if (!myName.trim()) { setErr('أدخل اسمك'); return; }
    if (joinCode.trim().length < 4) { setErr('أدخل الكود كاملاً'); return; }
    const code = joinCode.trim().toUpperCase(); setRoomCode(code); setMySeat(1);
    await subscribe(code, 1, myName.trim()); setPhase('joining');
  };

  const startGame = () => {
    if (selCats.length < 2) return;
    sync({ phase: 'game', cats: selCats, usedCells: [], current: null, showAnswer: false, activeSeat: 0, scores: [0, 0] });
    setPhase('game');
  };

  const pickCell = (group: string, tier: number) => {
    if (mySeat !== room.activeSeat) return;
    if (room.usedCells.includes(group + '_' + tier)) return;
    const q = pickQuestion(group, tier as 100|200|300|400|500);
    if (!q) return;
    sync({ current: { group, tier, q: { question: q.question, answer: q.answer } }, showAnswer: false });
  };

  const revealAnswer = () => {
    if (mySeat !== 0) return;
    sync({ showAnswer: true });
  };

  const markResult = (correct: boolean) => {
    if (mySeat !== 0) return;
    const cur = roomRef.current.current;
    if (!cur) return;
    const scores: [number, number] = [...roomRef.current.scores] as [number, number];
    if (correct) scores[room.activeSeat] += cur.tier;
    const used = [...roomRef.current.usedCells, cur.group + '_' + cur.tier];
    const nextSeat = (room.activeSeat === 0 ? 1 : 0) as 0 | 1;
    const allUsed = room.cats.every(g => TIERS.every(t => used.includes(g + '_' + t)));
    if (allUsed) { sync({ phase: 'result', scores, usedCells: used, current: null }); setPhase('result'); }
    else sync({ scores, usedCells: used, current: null, showAnswer: false, activeSeat: nextSeat });
  };

  const BG: React.CSSProperties = { background: '#ffffff', backgroundImage: 'radial-gradient(circle, rgba(0,27,135,0.10) 1.5px, transparent 1.5px)', backgroundSize: '20px 20px', display: 'flex', flexDirection: 'column', animation: 'fadeIn .3s ease both', direction: 'rtl', overflowY: 'auto' };
  const names = room.players.map(p => p.name);

  // Menu
  if (phase === 'menu') return (
    <div className="screen" style={BG}>
      <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackBtn onBack={onBack} />
        <span style={{ color: '#001B87', fontWeight: 900, fontSize: 20 }}>{wicked ? '😈 خبيثة' : '🎯 كلاسيك'} — أونلاين</span>
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
          <button onClick={join} style={{ background: '#001B87', color: '#30E7ED', fontWeight: 900, fontSize: 16, border: '2px solid #30E7ED', borderRadius: 10, padding: '14px 22px', cursor: 'pointer' }}>انضم →</button>
        </div>
      </div>
    </div>
  );

  // Creating — waiting for opponent
  if (phase === 'creating') return (
    <div className="screen" style={{ ...BG, alignItems: 'center', justifyContent: 'center', gap: 28, padding: 40 }}>
      <div style={{ color: '#001B87', fontWeight: 900, fontSize: 22 }}>غرفتك جاهزة!</div>
      <div style={{ background: '#001B87', borderRadius: 20, padding: '28px 48px', textAlign: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,.55)', fontSize: 14, marginBottom: 6 }}>الكود</div>
        <div style={{ color: '#30E7ED', fontWeight: 900, fontSize: 56, letterSpacing: 12, direction: 'ltr' }}>{roomCode}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#38E27D', animation: 'popIn .6s ease infinite alternate' }} />
        <span style={{ color: '#001B87', fontSize: 16, fontWeight: 700 }}>في انتظار الخصم...</span>
      </div>
      <button onClick={() => setPhase('menu')} style={{ background: 'rgba(0,27,135,.08)', color: '#001B87', fontWeight: 700, fontSize: 15, border: '1px solid rgba(0,27,135,.2)', borderRadius: 10, padding: '12px 28px', cursor: 'pointer' }}>إلغاء</button>
    </div>
  );

  // Joining — loading
  if (phase === 'joining') return (
    <div className="screen" style={{ ...BG, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 40 }}>
      <div style={{ fontSize: 48, animation: 'popIn .5s ease infinite alternate' }}>🔌</div>
      <div style={{ color: '#001B87', fontWeight: 900, fontSize: 20 }}>جاري الاتصال...</div>
    </div>
  );

  // Catpick — host picks categories
  if (room.phase === 'catpick' || room.phase === 'lobby') {
    const isHost = mySeat === 0;
    const bothIn = room.players.length === 2;
    const toggle = (g: string) => setSelCats(s => s.includes(g) ? s.filter(x => x !== g) : s.length < 6 ? [...s, g] : s);
    return (
      <OnlineLobby title={`${wicked ? '😈 خبيثة' : '🎯 كلاسيك'} — أونلاين`} roomCode={roomCode} onCancel={() => setPhase('menu')}>
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
              {room.players.map(p => (
                <div key={p.seat} style={{ flex: 1, background: p.seat === 0 ? '#30E7ED' : '#001B87', color: p.seat === 0 ? '#001B87' : '#30E7ED', borderRadius: 8, padding: '8px 12px', fontWeight: 800, fontSize: 14, textAlign: 'center' }}>
                  {p.name} {p.seat === mySeat ? '(أنت)' : ''}
                </div>
              ))}
            </div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, padding: '14px 24px 0' }}>اختر الفئات (2–6):</div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gridAutoRows: '140px', gap: 16, alignContent: 'start', padding: '4px 4px 90px' }}>
              {playableGroups.map((g, i) => {
                const sel = selCats.includes(g);
                return (
                  <div key={g} onClick={() => toggle(g)} style={{
                    borderRadius: 10, overflow: 'hidden', cursor: 'pointer', position: 'relative',
                    border: sel ? '3px solid #30E7ED' : '3px solid transparent',
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
            <div style={{ position: 'fixed', bottom: 28, right: 24, transform: selCats.length >= 2 ? 'translateX(0)' : 'translateX(120%)', transition: 'transform .35s cubic-bezier(.22,1,.36,1)', zIndex: 50 }}>
              <button onClick={startGame} style={{ background: '#30E7ED', color: '#001B87', fontWeight: 900, fontSize: 18, border: 'none', borderRadius: 14, padding: '18px 36px', boxShadow: '6px 6px 0 #001B87', cursor: 'pointer', clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>ابدأ اللعبة</span><span style={{ fontSize: 22 }}>▶</span>
              </button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ fontSize: 40, animation: 'popIn .5s ease infinite alternate' }}>⏳</div>
            <div style={{ color: '#fff', fontSize: 17, fontWeight: 700 }}>صاحب الغرفة يختار الفئات...</div>
          </div>
        )}
      </OnlineLobby>
    );
  }

  // Game board
  if (room.phase === 'game') {
    const myTurn = room.activeSeat === mySeat;
    const isHost = mySeat === 0;
    const p0 = room.players.find(p => p.seat === 0);
    const p1 = room.players.find(p => p.seat === 1);
    return (
      <div className="screen" style={{ background: '#ffffff', backgroundImage: 'radial-gradient(circle, rgba(0,27,135,0.10) 1.5px, transparent 1.5px)', backgroundSize: '20px 20px', display: 'flex', flexDirection: 'column' }}>
        {settingsOpen && <SettingsOverlay onClose={() => setSettingsOpen(false)} onExit={goHome} />}

        {/* Score bar */}
        <div className="score-bar">
          <div className={`score-team t1 ${room.activeSeat === 0 ? 'active' : ''}`}>
            <div style={{ display: 'flex', flexDirection: 'column', direction: 'rtl' }}>
              <div className="score-name" style={{ fontSize: 13 }}>{p0?.name || 'لاعب ١'}{p0?.seat === mySeat ? ' (أنت)' : ''}</div>
              <div className="score-pts t1">{room.scores[0]}</div>
            </div>
          </div>
          <div className="score-timer">
            <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 11, fontWeight: 800, color: 'var(--accent)', textAlign: 'center', lineHeight: 1.2, direction: 'rtl' }}>
              {room.activeSeat === 0 ? (p0?.name || 'لاعب ١') : (p1?.name || 'لاعب ٢')}
              <br /><span style={{ fontWeight: 700, color: 'rgba(48,231,237,.65)', fontSize: 10 }}>دورك للإجابة</span>
            </div>
            <div style={{ display: 'flex', gap: 5 }}><SettingsBtn onClick={() => setSettingsOpen(true)} /></div>
          </div>
          <div className={`score-team t2 ${room.activeSeat === 1 ? 'active' : ''}`}>
            <div style={{ display: 'flex', flexDirection: 'column', direction: 'rtl', alignItems: 'flex-end' }}>
              <div className="score-name" style={{ fontSize: 13 }}>{p1?.name || 'لاعب ٢'}{p1?.seat === mySeat ? ' (أنت)' : ''}</div>
              <div className="score-pts t2">{room.scores[1]}</div>
            </div>
          </div>
        </div>

        {/* Board */}
        {!room.current && (
          <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${room.cats.length}, 1fr)`, gap: 6 }}>
              {room.cats.map(g => (
                <div key={g} style={{ background: 'var(--surface)', borderRadius: 6, padding: '8px 6px', fontSize: 'clamp(9px,1.3vw,13px)', fontWeight: 700, color: 'var(--dim)', textAlign: 'center', direction: 'rtl', lineHeight: 1.2 }}>{g}</div>
              ))}
            </div>
            {TIERS.map(tier => (
              <div key={tier} style={{ display: 'grid', gridTemplateColumns: `repeat(${room.cats.length}, 1fr)`, gap: 6, flex: 1 }}>
                {room.cats.map(g => {
                  const key = g + '_' + tier;
                  const used = room.usedCells.includes(key);
                  return (
                    <div key={key} className={`board-cell ${used ? 'used' : ''}`}
                      onClick={() => !used && myTurn && pickCell(g, tier)}
                      style={{ cursor: used || !myTurn ? 'default' : 'pointer', opacity: !myTurn && !used ? 0.5 : undefined }}>
                      {used ? '' : tier}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Question panel */}
        {room.current && (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '12px 24px', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', animation: 'slideUp .25s ease both' }}>
                <div style={{ padding: '4px 12px', borderRadius: 4, background: 'var(--surface)', fontSize: 12, fontWeight: 700, color: 'var(--dim)', direction: 'rtl' }}>{room.current.group}</div>
                <div style={{ padding: '4px 14px', borderRadius: 4, fontSize: 14, fontWeight: 900, fontFamily: "'Tajawal',sans-serif", background: 'var(--accent)', color: '#001B87' }}>{room.current.tier}</div>
              </div>
              <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '16px 22px', fontSize: 'clamp(16px,2.3vw,26px)', fontWeight: 700, lineHeight: 1.6, textAlign: 'right', direction: 'rtl', borderRight: '4px solid var(--accent)', animation: 'slideUp .3s cubic-bezier(.22,1,.36,1) both', flex: 1, display: 'flex', alignItems: 'center' }}>
                {room.current.q.question}
              </div>
              {isHost && room.showAnswer && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-success" style={{ padding: '10px 24px', fontSize: 14 }} onClick={() => markResult(true)}>✓ صح</button>
                  <button className="btn btn-danger" style={{ padding: '10px 24px', fontSize: 14 }} onClick={() => markResult(false)}>✗ غلط</button>
                </div>
              )}
              {isHost && !room.showAnswer && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={{ background: '#001B87', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, fontFamily: "'Tajawal',sans-serif", cursor: 'pointer', boxShadow: '0 3px 0 rgba(0,0,0,.25)' }} onClick={revealAnswer}>👁 كشف الإجابة</button>
                </div>
              )}
              {!isHost && !room.showAnswer && (
                <div style={{ color: 'var(--dim)', fontSize: 13, fontWeight: 700 }}>في انتظار المضيف...</div>
              )}
            </div>
            <div style={{ width: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '14px 14px 14px 0', flexShrink: 0 }}>
              {room.showAnswer && (
                <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '12px 16px', textAlign: 'center', direction: 'rtl', animation: 'scaleIn .3s ease both' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: 1, marginBottom: 4 }}>الإجابة</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--success)' }}>{room.current.q.answer}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Result
  if (room.phase === 'result') {
    const winner = room.scores[0] > room.scores[1] ? 0 : room.scores[1] > room.scores[0] ? 1 : -1;
    const myWin = winner === mySeat;
    return (
      <div className="screen" style={{ ...BG, alignItems: 'center', justifyContent: 'center', gap: 24, padding: '40px 24px' }}>
        <div style={{ fontSize: 80, animation: 'popIn .4s ease both' }}>{winner === -1 ? '🤝' : myWin ? '🏆' : '💥'}</div>
        <div style={{ color: winner === -1 ? '#30E7ED' : myWin ? '#38E27D' : '#FF3D68', fontWeight: 900, fontSize: 32, textAlign: 'center' }}>
          {winner === -1 ? 'تعادل!' : myWin ? 'أنت الفائز!' : `${names[winner] || ''} فاز!`}
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {room.players.map(p => (
            <div key={p.seat} style={{ background: p.seat === winner ? '#30E7ED' : '#001B87', color: p.seat === winner ? '#001B87' : '#30E7ED', borderRadius: 12, padding: '16px 28px', textAlign: 'center', clipPath: p.seat === 0 ? 'polygon(0% 0%, 100% 3%, 97% 100%, 0% 100%)' : 'polygon(3% 0%, 100% 0%, 100% 97%, 0% 100%)' }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{p.name}</div>
              <div style={{ fontWeight: 900, fontSize: 36 }}>{room.scores[p.seat]}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          {mySeat === 0 && <button onClick={() => sync({ phase: 'catpick', cats: [], usedCells: [], current: null, showAnswer: false, activeSeat: 0, scores: [0, 0] })} style={{ background: '#30E7ED', color: '#001B87', fontWeight: 900, fontSize: 16, border: 'none', borderRadius: 12, padding: '14px 32px', boxShadow: '5px 5px 0 #001B87', cursor: 'pointer', clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)' }}>جولة جديدة ↺</button>}
          <button onClick={() => setPhase('menu')} style={{ background: 'rgba(255,255,255,.1)', color: '#fff', fontWeight: 700, fontSize: 16, border: '2px solid rgba(255,255,255,.2)', borderRadius: 12, padding: '14px 28px', cursor: 'pointer' }}>القائمة</button>
        </div>
      </div>
    );
  }

  return null;
}

