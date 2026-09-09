import { CARD_CLIP } from './CreditsSection';
import { NavCtx } from '../contexts/NavContext';
import guessNavy from '../assets/guess_navy.png';
import { useContext } from 'react';
import { MODE_ICONS } from '../modeIcons';
import type { MenuMode } from '../screenTypes';

export function MenuCard({ mode, selected, large = false, onClick, animDelay = 0, locked = false, subLocked = false }: {
  mode: MenuMode; selected: boolean; large?: boolean; onClick: () => void; animDelay?: number; locked?: boolean; subLocked?: boolean;
}) {
  const { goTo } = useContext(NavCtx);
  const clip = CARD_CLIP[mode];
  const bg  = locked ? '#001B87' : selected ? '#001B87' : '#30E7ED';
  const fg  = locked ? 'rgba(255,255,255,.18)' : selected ? '#F9F9F9' : '#001B87';
  const dim = locked ? 'rgba(255,255,255,.08)' : selected ? 'rgba(249,249,249,.35)' : 'rgba(0,27,135,.4)';
  const wm  = locked ? 'rgba(255,255,255,.04)' : selected ? 'rgba(48,231,237,.1)' : 'rgba(0,27,135,.1)';

  const icon = MODE_ICONS[mode];
  const iconSrc = (locked || selected) ? icon?.white : icon?.navy;

  const inner = () => {
    if (mode === 'classic') return (
      <>
        {/* "الأكثر لعباً" badge */}
        <div style={{
          position: 'absolute', top: 10, left: 10, zIndex: 2,
          background: selected ? '#30E7ED' : '#001B87',
          color: selected ? '#001B87' : '#F9F9F9',
          fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 11,
          padding: '3px 10px', borderRadius: 4,
          boxShadow: '2px 2px 0 rgba(0,0,0,.2)',
        }}>الأكثر لعباً!</div>
        {/* Watermark */}
        <div style={{
          position: 'absolute', bottom: -20, right: -10,
          fontFamily: "'Tajawal',sans-serif", fontWeight: 900,
          fontSize: 90, lineHeight: 1, color: wm,
          pointerEvents: 'none', userSelect: 'none', whiteSpace: 'nowrap',
        }}>عادية</div>
        <img src={iconSrc} alt="" style={{ position: 'absolute', top: 10, right: 10, width: 52, height: 52, objectFit: 'contain', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 14, left: 14, direction: 'rtl' }}>
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 500, fontSize: 10, letterSpacing: 3, color: dim }}>CLASSIC</div>
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 32, color: fg, lineHeight: 1 }}>عادية</div>
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 400, fontSize: 11, color: dim, marginTop: 3 }}>فريقين أو الكل ضد الكل</div>
        </div>
      </>
    );

    if (mode === 'thirty') return (
      <>
        <div style={{
          position: 'absolute', top: -12, left: -6,
          fontFamily: "'Tajawal',sans-serif", fontWeight: 900,
          fontSize: 100, lineHeight: 1, color: wm,
          pointerEvents: 'none', userSelect: 'none',
        }}>30</div>
        <div style={{ position: 'absolute', bottom: 14, right: 12, direction: 'rtl', textAlign: 'right' }}>
          <img src={iconSrc} alt="" style={{ width: 32, height: 32, objectFit: 'contain', marginBottom: 4, display: 'block', marginLeft: 'auto' }} />
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 18, color: fg, lineHeight: 1.1 }}>تحدي الثلاثين</div>
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 400, fontSize: 10, color: dim, marginTop: 3 }}>كم اجابة صحيحة تعدد بـ30 ثانية؟</div>
        </div>
      </>
    );

    if (mode === 'wicked') return (
      <>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: selected
            ? 'repeating-linear-gradient(135deg, transparent, transparent 18px, rgba(192,132,252,.07) 18px, rgba(192,132,252,.07) 20px)'
            : 'repeating-linear-gradient(135deg, transparent, transparent 18px, rgba(0,27,135,.06) 18px, rgba(0,27,135,.06) 20px)',
          pointerEvents: 'none',
        }} />
        <img src={iconSrc} alt="" style={{ position: 'absolute', top: 10, right: 10, width: 36, height: 36, objectFit: 'contain', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 14, left: 12, right: 12, direction: 'rtl' }}>
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 20, color: fg }}>خبيثة</div>
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 400, fontSize: 10, color: dim, marginTop: 2 }}>فوضى ومفاجآت</div>
        </div>
      </>
    );

    if (mode === 'guess') return (
      <>
        <div style={{
          position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)',
          fontFamily: "'Tajawal',sans-serif", fontWeight: 900,
          fontSize: 70, lineHeight: 1, color: wm,
          pointerEvents: 'none', userSelect: 'none',
        }}>?</div>
        <div style={{ position: 'absolute', top: 10, left: 10, background: selected ? '#30E7ED' : '#001B87', color: selected ? '#001B87' : '#F9F9F9', fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 11, padding: '3px 10px', borderRadius: 4, boxShadow: '2px 2px 0 rgba(0,0,0,.2)', textAlign: 'right' }}>!جديد</div>
        <img src={iconSrc} alt="" style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, objectFit: 'contain', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 14, right: 12, direction: 'rtl', textAlign: 'right' }}>
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 20, color: fg }}>خمن أسرع</div>
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 400, fontSize: 10, color: dim, marginTop: 2 }}>حاول تعرف البطاقة اللي عند خصمك</div>
        </div>
      </>
    );

    if (mode === 'solo') return (
      <>
        <div style={{
          position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)',
          fontFamily: "'Tajawal',sans-serif", fontWeight: 900,
          fontSize: 70, lineHeight: 1, color: wm,
          pointerEvents: 'none', userSelect: 'none',
        }}>?</div>
        <img src={iconSrc ?? guessNavy} alt="" style={{ position: 'absolute', top: 10, left: 10, width: 32, height: 32, objectFit: 'contain', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 14, right: 12, direction: 'rtl', textAlign: 'right' }}>
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 20, color: fg }}>لعبة فردية</div>
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 400, fontSize: 10, color: dim, marginTop: 2 }}>كم جواب صحيح تقدر تجيب بدون ما تغلط؟</div>
        </div>
      </>
    );

    /* settings */
    return (
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <img src={iconSrc} alt="" style={{ width: 44, height: 44, objectFit: 'contain' }} />
        <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 13, color: fg }}>الإعدادات</div>
      </div>
    );
  };

  return (
    <button onClick={locked ? (subLocked ? () => goTo({ id: 'store' }) : undefined) : onClick} style={{
      flex: large ? 2 : 1,
      border: subLocked ? '2px solid #FFD700' : 'none', borderRadius: 12, cursor: locked && !subLocked ? 'default' : 'pointer',
      background: bg,
      position: 'relative', overflow: 'hidden',
      minHeight: 0,
      clipPath: clip,
      transition: 'background .22s ease, transform .18s ease, box-shadow .18s ease',
      transform: selected ? 'scale(1.02)' : 'scale(1)',
      boxShadow: selected ? '5px 5px 0 rgba(0,0,0,.25)' : '3px 3px 0 rgba(0,0,0,.15)',
      zIndex: selected ? 10 : 1,
      animation: `cardSlideIn .52s cubic-bezier(.22,1,.36,1) ${animDelay}ms backwards`,
    }}>
      {inner()}
      {subLocked && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <span style={{ fontSize: 22 }}>👑</span>
          <span style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 10, color: '#FFD700' }}>اشتراك</span>
        </div>
      )}
    </button>
  );
}

