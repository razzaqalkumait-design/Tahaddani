import { useState } from 'react';
import type { GuessCategory } from '../api';

// ─── Guess Game ───────────────────────────────────────
// GuessCategory type (key,name,emoji,count) comes from api.ts
export type GuessPhase = 'setup' | 'catpick' | 'deal' | 'showP0' | 'showP1' | 'playing' | 'result';

export function GuessCard({ item, catKey, revealed }: { item: { name: string; file: string }; catKey: string; revealed: boolean }) {
  const [imgErr, setImgErr] = useState(false);
  const src = `/images/guess/${catKey}/${item.file}`;
  return (
    <div style={{ width: 180, height: 220, borderRadius: 16, overflow: 'hidden', position: 'relative', background: '#001B87', boxShadow: '6px 6px 0 rgba(0,0,0,.4)' }}>
      {!imgErr
        ? <img src={src} alt={item.name} onError={() => setImgErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60, background: 'linear-gradient(135deg,#001B87,#0058B3)' }}>{item.name[0]}</div>
      }
      {revealed && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,.75)', padding: '10px', textAlign: 'center', color: '#fff', fontWeight: 900, fontSize: 15 }}>{item.name}</div>
      )}
      {!revealed && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>❓</div>
      )}
    </div>
  );
}

