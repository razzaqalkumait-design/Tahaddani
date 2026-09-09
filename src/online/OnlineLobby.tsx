import { BackBtn } from '../components/BackBtn';

// ─── Online Lobby shell (reused by Classic + Thirty) ─
export function OnlineLobby({ title, roomCode, onCancel, children }: {
  title: string; roomCode: string; onCancel: () => void; children: React.ReactNode;
}) {
  return (
    <div className="screen" style={{ background: '#ffffff', backgroundImage: 'radial-gradient(circle, rgba(0,27,135,0.10) 1.5px, transparent 1.5px)', backgroundSize: '20px 20px', display: 'flex', flexDirection: 'column', animation: 'fadeIn .3s ease both', direction: 'rtl', overflowY: 'auto' }}>
      <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackBtn onBack={onCancel} />
        <span style={{ color: '#001B87', fontWeight: 900, fontSize: 20 }}>{title}</span>
        <span style={{ marginRight: 'auto', background: '#001B87', color: '#30E7ED', fontSize: 13, fontWeight: 800, padding: '4px 12px', borderRadius: 6, letterSpacing: 3, direction: 'ltr' }}>{roomCode}</span>
      </div>
      {children}
    </div>
  );
}

