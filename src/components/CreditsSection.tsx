import { useState } from 'react';
import type { MenuMode } from '../screenTypes';

// ─── Home ─────────────────────────────────────────────
export const CARD_CLIP: Record<MenuMode, string> = {
  classic:  'polygon(0% 0%, 100% 3%, 97% 100%, 0% 100%)',
  thirty:   'polygon(3% 0%, 100% 0%, 100% 100%, 0% 97%)',
  wicked:   'polygon(5% 0%, 100% 0%, 95% 100%, 0% 100%)',
  guess:    'polygon(0% 0%, 97% 0%, 100% 100%, 3% 100%)',
  settings: 'polygon(4% 2%, 100% 0%, 96% 100%, 0% 100%)',
  solo:     'polygon(0% 0%, 97% 0%, 100% 100%, 3% 100%)',
};

export const CREDITS = [
  { role: 'التصميم والبرمجة', name: 'Razzaq Alkumait', ig: 'https://www.instagram.com/razzaqalkumait/' },
  { role: 'واجهة المستخدم وتنفيذ التطبيق', name: 'Shaneen Dhahd', ig: 'https://www.instagram.com/dhahdz/' },
  { role: 'الفحص وإعداد الأسئلة', name: 'Khazaal Basil', ig: 'https://www.instagram.com/kh_zl/' },
];

export function CreditsSection() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '4px 0', fontFamily: "'Tajawal',sans-serif",
      }}>
        <span style={{ color: 'rgba(255,255,255,.55)', fontSize: 14, fontWeight: 700 }}>الفريق</span>
        <span style={{ color: '#30E7ED', fontSize: 13, fontWeight: 800, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s', display: 'inline-block' }}>▾</span>
      </button>
      {open && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeIn .2s ease both' }}>
          {CREDITS.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 11, color: 'rgba(255,255,255,.4)', fontWeight: 600 }}>{c.role}</span>
                <span style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 14, color: '#fff', fontWeight: 800 }}>{c.name}</span>
              </div>
              <a href={c.ig} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',
                boxShadow: '2px 2px 0 rgba(0,0,0,.3)',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

