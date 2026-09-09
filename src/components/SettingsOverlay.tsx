import { AudioCtx } from '../contexts/AudioContext';
import { useContext, useState } from 'react';

// ─── Settings overlay (game screens) ─────────────────
export function SettingsOverlay({ onClose, onExit }: { onClose: () => void; onExit: () => void }) {
  const { musicOn, setMusicOn, volume, setVolume } = useContext(AudioCtx);
  const [confirmExit, setConfirmExit] = useState(false);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,8,40,.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn .18s ease both', direction: 'rtl' }}
      onClick={!confirmExit ? onClose : undefined}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#001B87', borderRadius: 16, padding: '30px 32px',
        width: 'min(92vw, 370px)',
        clipPath: 'polygon(0% 0%, 100% 2%, 98% 100%, 0% 100%)',
        boxShadow: '7px 7px 0 #30E7ED',
        animation: 'slideUp .28s cubic-bezier(.22,1,.36,1) both',
      }}>
        {!confirmExit ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 }}>
              <span style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 22, color: '#F9F9F9' }}>الإعدادات</span>
              <button onClick={onClose} style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 8, color: 'rgba(255,255,255,.7)', fontSize: 18, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
            </div>

            {/* Music toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <span style={{ color: '#F9F9F9', fontWeight: 700, fontSize: 16 }}>الموسيقى</span>
              <button onClick={() => setMusicOn(!musicOn)} style={{
                width: 52, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
                background: musicOn ? '#38E27D' : 'rgba(255,255,255,.15)',
                position: 'relative', transition: 'background .22s', flexShrink: 0,
              }}>
                <div style={{
                  position: 'absolute', top: 3,
                  left: musicOn ? 26 : 3, width: 22, height: 22,
                  borderRadius: '50%', background: '#fff',
                  transition: 'left .22s', boxShadow: '0 2px 6px rgba(0,0,0,.35)',
                }} />
              </button>
            </div>

            {/* Volume */}
            <div style={{ marginBottom: 30 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: '#F9F9F9', fontWeight: 700, fontSize: 16 }}>مستوى الصوت</span>
                <span style={{ color: '#30E7ED', fontWeight: 900, fontSize: 16 }}>{volume}%</span>
              </div>
              <input type="range" min={0} max={100} value={volume}
                onChange={e => setVolume(Number(e.target.value))}
                className="settings-range"
                style={{ opacity: musicOn ? 1 : 0.4, transition: 'opacity .2s' }}
              />
            </div>

            {/* Exit */}
            <button onClick={() => setConfirmExit(true)} style={{
              width: '100%', background: '#FF3D68', color: '#fff',
              fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 17,
              border: 'none', borderRadius: 10, padding: '15px 0', cursor: 'pointer',
              boxShadow: '0 5px 0 rgba(0,0,0,.35)',
              clipPath: 'polygon(2% 0%, 100% 0%, 98% 100%, 0% 100%)',
            }}>← الخروج من اللعبة</button>
          </>
        ) : (
          <>
            <div style={{ color: '#F9F9F9', fontWeight: 900, fontSize: 22, marginBottom: 10, textAlign: 'center' }}>هل أنت متأكد؟</div>
            <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 14, textAlign: 'center', marginBottom: 28 }}>ستنتهي اللعبة الحالية</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={onExit} style={{ flex: 1, background: '#FF3D68', color: '#fff', fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 18, border: 'none', borderRadius: 10, padding: '16px 0', cursor: 'pointer', boxShadow: '0 4px 0 rgba(0,0,0,.3)', clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)' }}>نعم</button>
              <button onClick={() => setConfirmExit(false)} style={{ flex: 1, background: 'rgba(255,255,255,.09)', color: '#fff', fontFamily: "'Tajawal',sans-serif", fontWeight: 700, fontSize: 18, border: '2px solid rgba(255,255,255,.2)', borderRadius: 10, padding: '16px 0', cursor: 'pointer', clipPath: 'polygon(0% 0%, 96% 0%, 100% 100%, 4% 100%)' }}>لا</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function SettingsBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} title="الإعدادات" style={{
      background: 'rgba(0,0,0,.32)', border: '1.5px solid rgba(255,255,255,.14)',
      borderRadius: 10, width: 40, height: 40, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, color: 'rgba(255,255,255,.75)', fontSize: 19,
      transition: 'background .15s',
    }}>⚙</button>
  );
}

