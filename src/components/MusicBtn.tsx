import { AudioCtx } from '../contexts/AudioContext';
import { useContext, useState } from 'react';

// ─── Music button (home screen) ──────────────────────
export function MusicBtn() {
  const { musicOn, setMusicOn, volume, setVolume } = useContext(AudioCtx);
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="الموسيقى"
        style={{
          width: 36, height: 36, borderRadius: 10, border: '1.5px solid rgba(0,27,135,.18)',
          background: musicOn ? 'rgba(48,231,237,.18)' : 'rgba(0,27,135,.07)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0, transition: 'background .2s',
        }}
      >
        {musicOn ? '🎵' : '🔇'}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', top: 44, left: '50%', transform: 'translateX(-50%)',
            background: '#001B87', borderRadius: 14, padding: '16px 18px',
            boxShadow: '5px 5px 0 #30E7ED', zIndex: 200, minWidth: 190,
            display: 'flex', flexDirection: 'column', gap: 14, direction: 'rtl',
            animation: 'slideUp .2s cubic-bezier(.22,1,.36,1) both',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: "'Tajawal',sans-serif" }}>الموسيقى</span>
            <button onClick={() => setMusicOn(!musicOn)} style={{
              width: 46, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: musicOn ? '#38E27D' : 'rgba(255,255,255,.2)', position: 'relative', transition: 'background .2s', flexShrink: 0,
            }}>
              <div style={{
                position: 'absolute', top: 2,
                left: musicOn ? 22 : 2, width: 20, height: 20,
                borderRadius: '50%', background: '#fff',
                transition: 'left .2s', boxShadow: '0 2px 4px rgba(0,0,0,.3)',
              }} />
            </button>
          </div>
          {/* volume */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 13, fontFamily: "'Tajawal',sans-serif" }}>الصوت</span>
              <span style={{ color: '#30E7ED', fontWeight: 800, fontSize: 13 }}>{volume}%</span>
            </div>
            <input
              type="range" min={0} max={100} value={volume}
              onChange={e => setVolume(Number(e.target.value))}
              className="settings-range"
              style={{ opacity: musicOn ? 1 : 0.4, transition: 'opacity .2s' }}
              disabled={!musicOn}
            />
          </div>
        </div>
      )}

      {/* click-outside to close */}
      {open && <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setOpen(false)} />}
    </div>
  );
}

