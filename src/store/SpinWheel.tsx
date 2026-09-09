import { useEffect, useRef, useState } from 'react';

// ─── Daily Wheel ───────────────────────────────────────
export interface WheelSegment { label: string; emoji: string; color: string; weight: number; reward: 'coins' | 'all_packs' | 'no_ads'; value: number; }
export const WHEEL_SEGMENTS: WheelSegment[] = [
  { label: '50 عملة',           emoji: '🪙', color: '#30E7ED', weight: 30, reward: 'coins',    value: 50   },
  { label: 'باقات مجانية 24س', emoji: '🎮', color: '#38E27D', weight: 10, reward: 'all_packs', value: 0    },
  { label: '100 عملة',          emoji: '💰', color: '#FFD700', weight: 27, reward: 'coins',    value: 100  },
  { label: 'بدون إعلانات 30د', emoji: '🚫', color: '#c084fc', weight: 20, reward: 'no_ads',   value: 30   },
  { label: '75 عملة',           emoji: '🪙', color: '#30E7ED', weight: 10, reward: 'coins',    value: 75   },
  { label: '1,000 عملة',        emoji: '🏆', color: '#FF3D68', weight: 3,  reward: 'coins',    value: 1000 },
];

export const getDailyState = () => {
  try {
    const s = JSON.parse(localStorage.getItem('ta_daily') || '{}');
    return { lastDate: s.lastDate || '', streak: Number(s.streak || 0) };
  } catch { return { lastDate: '', streak: 0 }; }
};
export const saveDailyState = (lastDate: string, streak: number) =>
  localStorage.setItem('ta_daily', JSON.stringify({ lastDate, streak }));
export const todayStr = () => new Date().toISOString().slice(0, 10);
export const canClaimDaily = () => getDailyState().lastDate !== todayStr();

export function pickWheelSegment(): number {
  const total = WHEEL_SEGMENTS.reduce((s, seg) => s + seg.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
    r -= WHEEL_SEGMENTS[i].weight;
    if (r <= 0) return i;
  }
  return 0;
}

export function SpinWheel({ onClose, onReward }: { onClose: () => void; onReward: (seg: WheelSegment) => void }) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const segCount = WHEEL_SEGMENTS.length;
  const segAngle = (2 * Math.PI) / segCount;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const size = canvas.width;
    const cx = size / 2, cy = size / 2, r = size / 2 - 8;
    ctx.clearRect(0, 0, size, size);
    const rotRad = (rotation * Math.PI) / 180;
    WHEEL_SEGMENTS.forEach((seg, i) => {
      const start = rotRad + i * segAngle - Math.PI / 2;
      const end = start + segAngle;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end); ctx.closePath();
      ctx.fillStyle = seg.color; ctx.fill();
      ctx.strokeStyle = '#001B87'; ctx.lineWidth = 2; ctx.stroke();
      ctx.save(); ctx.translate(cx, cy);
      ctx.rotate(start + segAngle / 2);
      ctx.textAlign = 'right'; ctx.fillStyle = '#001B87';
      ctx.font = `bold 11px Tajawal,sans-serif`;
      ctx.fillText(seg.emoji + ' ' + seg.label, r - 10, 4);
      ctx.restore();
    });
    // Center circle
    ctx.beginPath(); ctx.arc(cx, cy, 22, 0, 2 * Math.PI);
    ctx.fillStyle = '#001B87'; ctx.fill();
    ctx.strokeStyle = '#30E7ED'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#30E7ED'; ctx.font = 'bold 10px Tajawal,sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('دوّر', cx, cy + 4);
  }, [rotation]);

  const spin = () => {
    if (spinning) return;
    setSpinning(true); setResult(null);
    const winIdx = pickWheelSegment();
    const targetAngle = 360 * 7 + (360 - (winIdx * (360 / segCount) + (360 / segCount) / 2));
    const finalRot = rotation + targetAngle;
    let start: number | null = null;
    const duration = 4000;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      setRotation(rotation + ease * targetAngle);
      if (progress < 1) { requestAnimationFrame(animate); }
      else { setRotation(finalRot % 360); setResult(winIdx); setSpinning(false); }
    };
    requestAnimationFrame(animate);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 200, gap: 20, padding: 24 }}>
      <div style={{ color: '#30E7ED', fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 22 }}>🎡 العجلة اليومية</div>

      {/* Pointer */}
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderTop: '22px solid #FF3D68', zIndex: 2, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.5))' }} />
        <canvas ref={canvasRef} width={290} height={290} style={{ borderRadius: '50%', boxShadow: '0 0 0 4px #30E7ED, 0 8px 32px rgba(0,27,135,.6)', display: 'block' }} onClick={!spinning && result === null ? spin : undefined} />
      </div>

      {result !== null ? (
        <div style={{ textAlign: 'center', animation: 'scaleIn .4s ease both' }}>
          <div style={{ fontSize: 48 }}>{WHEEL_SEGMENTS[result].emoji}</div>
          <div style={{ color: WHEEL_SEGMENTS[result].color, fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 20, marginTop: 4 }}>{WHEEL_SEGMENTS[result].label}</div>
          <button onClick={() => onReward(WHEEL_SEGMENTS[result!])} style={{ marginTop: 14, background: '#30E7ED', color: '#001B87', fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 16, border: 'none', borderRadius: 10, padding: '12px 32px', cursor: 'pointer', boxShadow: '4px 4px 0 #001B87' }}>استلم المكافأة!</button>
        </div>
      ) : (
        <div style={{ color: 'rgba(255,255,255,.5)', fontFamily: "'Tajawal',sans-serif", fontSize: 14 }}>
          {spinning ? 'جاري الدوران...' : 'اضغط على العجلة للدوران'}
        </div>
      )}

      <button onClick={onClose} style={{ background: 'rgba(255,255,255,.1)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontFamily: "'Tajawal',sans-serif", fontSize: 13 }}>إغلاق</button>
    </div>
  );
}

