import razzaqLogo from '../assets/razzaq-logo.png';
import tahaddaniLogo from '../assets/tahaddani-white.png';
import { useEffect, useState } from 'react';

// ─── Welcome ─────────────────────────────────────────
export type WelcomePhase = 'idle' | 'fusing' | 'moving' | 'opening' | 'done';

export function WelcomeScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<WelcomePhase>('idle');
  const [logoIn, setLogoIn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setLogoIn(true), 120); return () => clearTimeout(t); }, []);

  const handleTap = () => {
    if (phase !== 'idle') return;
    setPhase('fusing');
    setTimeout(() => setPhase('moving'), 700);
    setTimeout(() => setPhase('opening'), 1320);
    setTimeout(() => { setPhase('done'); onDone(); }, 2150);
  };

  const fused = phase === 'fusing' || phase === 'moving';
  const opening = phase === 'opening' || phase === 'done';
  const panelOut = opening;

  const panelTransition = opening
    ? 'transform 0.82s cubic-bezier(0.55, 0, 1, 0.45)'
    : 'transform 0.65s cubic-bezier(0.22, 1, 0.36, 1)';

  const logoTransition = 'top 0.55s cubic-bezier(0.22,1,0.36,1), left 0.55s cubic-bezier(0.22,1,0.36,1), width 0.55s cubic-bezier(0.22,1,0.36,1), height 0.55s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease';

  const isIdle = phase === 'idle' || phase === 'fusing';

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, cursor: phase === 'idle' ? 'pointer' : 'default' }}
      onClick={handleTap}
    >
      {/* Idle background layer */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'var(--bg)',
        opacity: phase === 'idle' ? 1 : 0,
        transition: 'opacity 0.35s ease',
        pointerEvents: 'none',
      }} />

      {/* Accent top stripe (idle) */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 4,
        background: 'var(--accent)', zIndex: 2,
        opacity: phase === 'idle' ? 1 : 0,
        transition: 'opacity 0.2s ease',
        pointerEvents: 'none',
      }} />

      {/* ── Left panel ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '50%', height: '100%',
        background: 'var(--surface)',
        zIndex: 10, overflow: 'hidden',
        willChange: 'transform',
        transition: panelTransition,
        transform: (!fused && !opening) ? 'translateX(-100%)' : panelOut ? 'translateX(-100%)' : 'translateX(0)',
      }}>
        {/* Cyan top accent bar on panel */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'var(--accent)' }} />
        {/* Razzaq logo — left half */}
        <img src={razzaqLogo} alt="" style={{
          position: 'absolute', bottom: 28,
          right: 0, transform: 'translateX(50%)',
          height: 38, width: 'auto',
          pointerEvents: 'none', userSelect: 'none',
        }} />
      </div>

      {/* ── Right panel ── */}
      <div style={{
        position: 'absolute', top: 0, right: 0, width: '50%', height: '100%',
        background: '#0EC4CC',
        zIndex: 10, overflow: 'hidden',
        willChange: 'transform',
        transition: panelTransition,
        transform: (!fused && !opening) ? 'translateX(100%)' : panelOut ? 'translateX(100%)' : 'translateX(0)',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'var(--accent)' }} />
        {/* Razzaq logo — right half */}
        <img src={razzaqLogo} alt="" style={{
          position: 'absolute', bottom: 28,
          left: 0, transform: 'translateX(-50%)',
          height: 38, width: 'auto',
          pointerEvents: 'none', userSelect: 'none',
        }} />
      </div>

      {/* Glowing seam at join point */}
      <div style={{
        position: 'absolute', top: 0, left: '50%', width: 2, height: '100%',
        transform: 'translateX(-50%)',
        background: 'var(--accent)',
        boxShadow: '0 0 16px var(--accent), 0 0 40px rgba(48,231,237,.5)',
        zIndex: 15, pointerEvents: 'none',
        opacity: fused ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }} />

      {/* ── Tahaddani logo (floats above panels) ── */}
      <img
        src={tahaddaniLogo}
        alt="تحداني"
        style={{
          position: 'absolute', zIndex: 20,
          pointerEvents: 'none', userSelect: 'none',
          transition: logoTransition,
          objectFit: 'contain',
          ...(isIdle ? {
            top: '50%', left: '50%',
            transform: `translate(-50%, -50%) ${logoIn ? 'scale(1)' : 'scale(0.7)'}`,
            width: 'clamp(240px, 34vw, 360px)',
            height: 'auto',
            opacity: logoIn ? 1 : 0,
          } : phase === 'moving' ? {
            top: 8, left: 20,
            transform: 'none',
            width: 110, height: 34,
            opacity: 1,
          } : {
            top: 8, left: 20,
            transform: 'none',
            width: 110, height: 34,
            opacity: 0,
          }),
        }}
      />

      {/* Idle razzaq logo (standalone, hides when panels arrive) */}
      <img src={razzaqLogo} alt="Razzaq" style={{
        position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
        height: 38, width: 'auto', zIndex: 3,
        opacity: phase === 'idle' ? (logoIn ? 1 : 0) : 0,
        transition: 'opacity 0.25s ease',
        pointerEvents: 'none', userSelect: 'none',
      }} />

      {/* Tap hint */}
      <div style={{
        position: 'absolute', bottom: 82, left: '50%', transform: 'translateX(-50%)',
        zIndex: 21, fontWeight: 700, fontSize: 13,
        color: 'var(--dim)', letterSpacing: 4,
        opacity: phase === 'idle' ? (logoIn ? 1 : 0) : 0,
        transition: 'opacity 0.3s ease 0.4s',
        pointerEvents: 'none', whiteSpace: 'nowrap',
      }}>
        اضغط للبدء
      </div>
    </div>
  );
}

