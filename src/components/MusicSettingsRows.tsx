import { AudioCtx } from '../contexts/AudioContext';
import { useContext } from 'react';

// ─── Music settings rows (used in home settings modal) ─
export function MusicSettingsRows() {
  const { musicOn, setMusicOn, volume, setVolume } = useContext(AudioCtx);
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'Tajawal',sans-serif", color: 'rgba(255,255,255,.65)', fontSize: 15 }}>الموسيقى</span>
        <button onClick={() => setMusicOn(!musicOn)} style={{
          width: 50, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
          background: musicOn ? '#38E27D' : 'rgba(255,255,255,.18)', position: 'relative', transition: 'background .2s', flexShrink: 0,
        }}>
          <div style={{ position: 'absolute', top: 3, left: musicOn ? 24 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 2px 5px rgba(0,0,0,.3)' }} />
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: "'Tajawal',sans-serif", color: 'rgba(255,255,255,.65)', fontSize: 15 }}>مستوى الصوت</span>
          <span style={{ color: '#30E7ED', fontWeight: 800, fontSize: 14 }}>{volume}%</span>
        </div>
        <input type="range" min={0} max={100} value={volume} onChange={e => setVolume(Number(e.target.value))} className="settings-range" style={{ opacity: musicOn ? 1 : 0.4, transition: 'opacity .2s' }} disabled={!musicOn} />
      </div>
    </>
  );
}

