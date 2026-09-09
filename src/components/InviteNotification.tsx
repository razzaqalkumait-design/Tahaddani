import type { GameInvite, InviteMode } from '../supabase';

// ─── Invite notification ──────────────────────────────
export const MODE_LABELS_AR: Record<InviteMode, string> = { classic: '🎯 كلاسيك', wicked: '😈 خبيثة', thirty: '⚡ الثلاثين', guess: '🕵️ خمّن أسرع' };

export function InviteNotification({ invite, onAccept, onDecline }: { invite: GameInvite; onAccept: () => void; onDecline: () => void }) {
  return (
    <div style={{
      position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      zIndex: 500, width: 'min(92vw, 360px)',
      background: '#001B87', borderRadius: 16,
      border: '2px solid #30E7ED',
      boxShadow: '6px 6px 0 #30E7ED',
      padding: '18px 20px',
      direction: 'rtl',
      animation: 'slideUp .35s cubic-bezier(.22,1,.36,1) both',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{ fontSize: 30, flexShrink: 0 }}>⚔️</div>
        <div>
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 15, color: '#F9F9F9', marginBottom: 4 }}>
            تحدي من {invite.from_name}!
          </div>
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 13, color: 'rgba(255,255,255,.55)' }}>
            {MODE_LABELS_AR[invite.mode]} — كود: <span style={{ color: '#30E7ED', fontWeight: 800, letterSpacing: 3, direction: 'ltr', display: 'inline-block' }}>{invite.room_code}</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onAccept} style={{
          flex: 1, background: '#30E7ED', color: '#001B87',
          fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 15,
          border: 'none', borderRadius: 10, padding: '12px 0', cursor: 'pointer',
          boxShadow: '3px 3px 0 rgba(0,0,0,.25)',
        }}>انضم ▶</button>
        <button onClick={onDecline} style={{
          flex: 1, background: 'rgba(255,255,255,.07)', color: 'rgba(255,255,255,.5)',
          fontFamily: "'Tajawal',sans-serif", fontWeight: 700, fontSize: 15,
          border: '1px solid rgba(255,255,255,.15)', borderRadius: 10, padding: '12px 0', cursor: 'pointer',
        }}>رفض</button>
      </div>
    </div>
  );
}

