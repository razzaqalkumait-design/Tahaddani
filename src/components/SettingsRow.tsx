// ─── Settings row ────────────────────────────────────
export function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,.08)',
    }}>
      <span style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 700, fontSize: 15, color: '#F9F9F9' }}>{label}</span>
      <span style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 700, fontSize: 13, color: '#30E7ED' }}>{value}</span>
    </div>
  );
}

