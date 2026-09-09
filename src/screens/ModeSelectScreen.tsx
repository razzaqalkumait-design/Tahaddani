import { BackBtn } from '../components/BackBtn';
import wickedNavy from '../assets/wicked_navy.png';
import wickedWhite from '../assets/wicked_white.png';
import { useState } from 'react';
import type { GameMode } from '../types';

// ─── Mode Select ─────────────────────────────────────
export function ModeSelectScreen({ wicked, onSelect, onBack }: { wicked: boolean; onSelect: (m: GameMode) => void; onBack: () => void }) {
  const [sel, setSel] = useState<GameMode | null>(null);
  const modes = wicked
    ? [
        { m: 'wickedTeams' as GameMode,     title: 'فريقين',        sub: 'فريق ضد فريق + أحداث خبيثة' },
        { m: 'wickedFfa' as GameMode,       title: 'الكل ضد الكل', sub: 'كل لاعب لنفسه' },
        { m: 'wickedTeamsHost' as GameMode, title: 'فريقين + مضيف', sub: 'مضيف يكشف الإجابة' },
      ]
    : [
        { m: 'teams' as GameMode,     title: 'فريقين',        sub: 'فريق ضد فريق' },
        { m: 'ffa' as GameMode,       title: 'الكل ضد الكل', sub: 'كل لاعب لنفسه' },
        { m: 'teamsHost' as GameMode, title: 'فريقين + مضيف', sub: 'مضيف يكشف الإجابة' },
      ];

  const clips = [
    'polygon(0% 0%, 100% 3%, 97% 100%, 0% 100%)',
    'polygon(3% 2%, 97% 0%, 100% 98%, 3% 100%)',
    'polygon(3% 0%, 100% 0%, 100% 100%, 0% 97%)',
  ];

  return (
    <div className="screen" style={{ background: '#ffffff', backgroundImage: 'radial-gradient(circle, rgba(0,27,135,0.10) 1.5px, transparent 1.5px)', backgroundSize: '20px 20px', display: 'flex', flexDirection: 'column', padding: '14px 12px', gap: 12, animation: 'fadeIn .3s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <BackBtn onBack={onBack} />
        <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 22, color: '#001B87', direction: 'rtl' }}>
          {wicked ? '😈 خبيثة' : '🎯 عادية'} — اختر نمط اللعب
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 10, minHeight: 0 }}>
        {modes.map((m, i) => {
          const selected = sel === m.m;
          return (
            <button key={m.m} onClick={() => setSel(s => s === m.m ? null : m.m)} style={{
              flex: 1,
              background: selected ? '#001B87' : '#30E7ED',
              border: selected ? '2px solid #30E7ED' : 'none',
              borderRadius: 10, cursor: 'pointer',
              clipPath: clips[i],
              position: 'relative', overflow: 'hidden',
              boxShadow: selected ? '5px 5px 0 #30E7ED' : '5px 5px 0 rgba(0,0,0,.25)',
              display: 'flex', flexDirection: 'column', padding: '22px 20px',
              animation: `slideUp .3s ease ${i * .09}s both`,
              transform: selected ? 'scale(1.03)' : 'scale(1)',
              transition: 'transform .15s ease, box-shadow .15s ease, background .15s ease',
            }}>
              <div style={{
                position: 'absolute', bottom: -10, left: -8,
                fontFamily: "'Tajawal',sans-serif", fontWeight: 900,
                fontSize: 90, lineHeight: 1, color: selected ? 'rgba(48,231,237,.06)' : 'rgba(0,27,135,.08)',
                pointerEvents: 'none', userSelect: 'none',
              }}>{String(i + 1).padStart(2, '0')}</div>
              <img src={selected ? wickedWhite : wickedNavy} alt="" style={{ width: 40, height: 40, objectFit: 'contain', marginBottom: 6 }} />
              <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 'clamp(20px, 3vw, 30px)', color: selected ? '#30E7ED' : '#001B87', direction: 'rtl', lineHeight: 1.1 }}>{m.title}</div>
              <div style={{ fontSize: 12, color: selected ? 'rgba(48,231,237,.55)' : 'rgba(0,27,135,.55)', direction: 'rtl', marginTop: 6 }}>{m.sub}</div>
              <div style={{ marginTop: 'auto', fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 9, letterSpacing: 3, color: selected ? 'rgba(48,231,237,.3)' : 'rgba(0,27,135,.28)' }}>SELECT →</div>
            </button>
          );
        })}
      </div>

      <div style={{
        position: 'fixed', bottom: 28, right: 24,
        transform: sel ? 'translateX(0)' : 'translateX(120%)',
        transition: 'transform .35s cubic-bezier(.22,1,.36,1)',
        zIndex: 50,
      }}>
        <button onClick={() => sel && onSelect(sel)} style={{
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

