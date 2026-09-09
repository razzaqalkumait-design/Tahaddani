// ─── Shared sub-screen back button ───────────────────
export function BackBtn({ onBack }: { onBack: () => void }) {
  return (
    <button onClick={onBack} style={{
      fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 15,
      background: '#30E7ED', color: '#001B87',
      border: 'none', borderRadius: 6, cursor: 'pointer',
      padding: '10px 22px', display: 'flex', alignItems: 'center', gap: 8,
      boxShadow: '4px 4px 0 #001B87',
      transition: 'transform .1s ease, box-shadow .1s ease',
      flexShrink: 0,
    }}>← رجوع</button>
  );
}

