// ─── Records ──────────────────────────────────────────
export interface GameRecord { id: string; mode: string; scores: { name: string; pts: number }[]; time: string; }
export const TA_RECORDS_KEY = 'ta_records';
export const getRecords = (): GameRecord[] => { try { return JSON.parse(localStorage.getItem(TA_RECORDS_KEY) || '[]'); } catch { return []; } };
export const saveRecord = (r: GameRecord) => { const arr = [r, ...getRecords()].slice(0, 50); localStorage.setItem(TA_RECORDS_KEY, JSON.stringify(arr)); };

export const MODE_LABELS: Record<string, string> = {
  classicTeams: 'كلاسيك — فريقين', classicFfa: 'كلاسيك — الكل ضد الكل', classicTeamsHost: 'كلاسيك — مضيف',
  wickedTeams: 'خبيثة — فريقين', wickedFfa: 'خبيثة — الكل ضد الكل', wickedTeamsHost: 'خبيثة — مضيف',
};

export function RecordsOverlay({ onClose }: { onClose: () => void }) {
  const records = getRecords();
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,8,40,.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn .18s ease both' }} onClick={onClose}>
      <div style={{ background: '#001B87', borderRadius: 16, width: 440, maxHeight: 320, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 0 60px rgba(48,231,237,.25)', animation: 'scaleIn .25s cubic-bezier(.22,1,.36,1) both' }} onClick={e => e.stopPropagation()}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 12px', borderBottom: '1px solid rgba(255,255,255,.1)', flexShrink: 0 }}>
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 16, color: '#30E7ED', direction: 'rtl' }}>📋 سجل الألعاب</div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 16, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
        {/* list */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8, direction: 'rtl' }}>
          {records.length === 0 && (
            <div style={{ color: 'rgba(255,255,255,.3)', fontFamily: "'Tajawal',sans-serif", textAlign: 'center', padding: '32px 0', fontSize: 13 }}>لا توجد سجلات بعد</div>
          )}
          {records.map(r => (
            <div key={r.id} style={{ background: 'rgba(255,255,255,.07)', borderRadius: 10, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 11, color: 'rgba(255,255,255,.35)', fontWeight: 600 }}>{r.time}</span>
                <span style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 11, fontWeight: 800, color: 'rgba(48,231,237,.7)', background: 'rgba(48,231,237,.08)', borderRadius: 5, padding: '2px 8px' }}>{r.mode}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {r.scores.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,27,135,.5)', borderRadius: 6, padding: '5px 10px' }}>
                    <span style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 700, fontSize: 13, color: '#fff' }}>{s.name}</span>
                    <span style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 15, color: '#30E7ED' }}>{s.pts}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

