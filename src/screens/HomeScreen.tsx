import { AvatarImg, resolveAvatar } from '../components/AvatarComponents';
import { CreditsSection } from '../components/CreditsSection';
import { MenuCard } from '../components/MenuCard';
import { MusicSettingsRows } from '../components/MusicSettingsRows';
import { ProfileModal } from '../components/ProfileModal';
import { RecordsOverlay } from '../components/RecordsOverlay';
import { SettingsRow } from '../components/SettingsRow';
import { SignupModal } from '../components/SignupModal';
import { AccountCtx } from '../contexts/AccountContext';
import { CoinsCtx } from '../contexts/CoinsContext';
import { SubCtx } from '../contexts/SubContext';
import { XP_PER_LEVEL, getLocalXp, xpIntoLevel, xpToLevel } from '../lib/xp';
import { SpinWheel, canClaimDaily, getDailyState, saveDailyState, todayStr } from '../store/SpinWheel';
import coinIcon from '../assets/coin-navy.png';
import settingsWhite from '../assets/settings_white.png';
import storeIcon from '../assets/store-navy.png';
import tahaddaniLogo from '../assets/tahaddani-white.png';
import { useContext, useState } from 'react';
import type { MenuMode, Screen } from '../screenTypes';

export function HomeScreen({ onNav }: { onNav: (s: Screen) => void }) {
  const [sel, setSel] = useState<MenuMode | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { coins, addCoins } = useContext(CoinsCtx);
  const { account, loading: accountLoading, resendVerification } = useContext(AccountCtx);
  const { tier } = useContext(SubCtx);
  const isFree = tier === 'free';
  const [resentEmail, setResentEmail] = useState(false);
  const [showRecords, setShowRecords] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showDailyHome, setShowDailyHome] = useState(false);
  const [dailyClaimedHome, setDailyClaimedHome] = useState(!canClaimDaily());
  const pick = (m: MenuMode) => {
    if (m === 'settings') { setSettingsOpen(true); return; }
    if (m === 'solo') { setSel(s => (s === m ? null : m)); return; }
    setSel(s => (s === m ? null : m));
  };

  const handlePlay = (online: boolean) => {
    if (!sel || sel === 'settings') return;
    if (sel === 'solo') { onNav({ id: 'solo' }); return; }
    if (sel === 'guess') { onNav({ id: 'guessSetup' }); return; }
    if (online) {
      if (sel === 'classic') onNav({ id: 'onlineClassic', wicked: false });
      else if (sel === 'wicked') onNav({ id: 'onlineClassic', wicked: true });
      else if (sel === 'thirty') onNav({ id: 'onlineThirty' });
    } else {
      if (sel === 'classic') onNav({ id: 'modeSelect', wicked: false });
      else if (sel === 'wicked') onNav({ id: 'modeSelect', wicked: true });
      else if (sel === 'thirty') onNav({ id: 'thirtySetup' });
    }
  };

  return (
    <div className="screen" style={{
      background: '#ffffff',
      backgroundImage: 'radial-gradient(circle, rgba(0,27,135,0.10) 1.5px, transparent 1.5px)',
      backgroundSize: '20px 20px',
      padding: '8px 12px 10px',
      display: 'flex', flexDirection: 'column', gap: 9,
      animation: 'fadeIn .3s ease both',
      overflow: 'hidden',
    }}>

      {/* Top bar: store + account | السجل + coins */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 6 }}>
          <button onClick={() => account ? onNav({ id: 'store' }) : setShowSignup(true)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#30E7ED', border: 'none',
            borderRadius: '0 10% 0 0',
            clipPath: 'polygon(6% 0%, 100% 0%, 94% 100%, 0% 100%)',
            boxShadow: '4px 4px 0 #001B87',
            padding: '6px 18px 6px 14px',
            cursor: 'pointer',
          }}>
            <img src={storeIcon} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
            <span style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 800, fontSize: 13, color: '#001B87' }}>المتجر</span>
          </button>
          {account ? (
            <button onClick={() => setShowProfile(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#001B87', border: '2px solid #30E7ED', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', boxShadow: '3px 3px 0 rgba(48,231,237,.2)', alignSelf: 'stretch' }}>
              {(() => { const r = resolveAvatar(account.avatar); return <AvatarImg src={r.src} fallback={r.fallback} size={22} style={{ borderRadius: '50%', flexShrink: 0 }} />; })()}
              <span style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 800, fontSize: 12, color: '#30E7ED', maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tier === 'vip' ? '👑 ' : ''}{account.name}</span>
            </button>
          ) : (
            <button onClick={() => setShowSignup(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#001B87', border: '2px solid #30E7ED', borderRadius: 8, padding: '4px 14px', cursor: 'pointer', alignSelf: 'stretch', animation: 'glowPulse 1.8s ease-in-out infinite', fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 12, color: '#30E7ED' }}>
              أنشئ حساباً ✦
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setShowDailyHome(true)} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: '#30E7ED', border: 'none',
            borderRadius: '0 10% 0 0',
            clipPath: 'polygon(6% 0%, 100% 0%, 94% 100%, 0% 100%)',
            boxShadow: '4px 4px 0 #001B87',
            padding: '6px 16px 6px 12px',
            cursor: 'pointer', alignSelf: 'stretch', position: 'relative',
            opacity: dailyClaimedHome ? 0.45 : 1,
          }}>
            {!dailyClaimedHome && <span style={{ position: 'absolute', top: 3, right: 6, width: 7, height: 7, borderRadius: '50%', background: '#FF3D68', border: '1.5px solid #30E7ED' }} />}
            <span style={{ fontSize: 14 }}>🎡</span>
            <span style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 800, fontSize: 13, color: '#001B87' }}>يومي</span>
          </button>
          <button onClick={() => setShowRecords(true)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#30E7ED', border: 'none',
            borderRadius: '0 10% 0 0',
            clipPath: 'polygon(6% 0%, 100% 0%, 94% 100%, 0% 100%)',
            boxShadow: '4px 4px 0 #001B87',
            padding: '6px 18px 6px 14px',
            cursor: 'pointer', alignSelf: 'stretch',
          }}>
            <span style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 800, fontSize: 13, color: '#001B87' }}>السجل</span>
          </button>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#30E7ED',
            borderRadius: '10% 0 0 0',
            clipPath: 'polygon(6% 0%, 100% 0%, 94% 100%, 0% 100%)',
            boxShadow: '4px 4px 0 #001B87',
            padding: '6px 14px 6px 18px',
          }}>
            <span style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 15, color: '#001B87' }}>{coins.toLocaleString()}</span>
            <img src={coinIcon} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
          </div>
        </div>
      </div>
      {showRecords && <RecordsOverlay onClose={() => setShowRecords(false)} />}
      {showSignup && <SignupModal onClose={() => setShowSignup(false)} />}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {showDailyHome && <SpinWheel onClose={() => setShowDailyHome(false)} onReward={(seg) => {
        if (!dailyClaimedHome) {
          const today = todayStr();
          const ds = getDailyState();
          const newStreak = ds.lastDate === new Date(new Date().getTime() - 86400000).toISOString().slice(0, 10) ? ds.streak + 1 : 1;
          saveDailyState(today, newStreak);
          setDailyClaimedHome(true);
          if (seg.reward === 'coins') addCoins(seg.value);
        }
        setShowDailyHome(false);
      }} />}

      {/* XP bar */}
      {account && (() => {
        const xp = account.xp ?? getLocalXp();
        const lvl = xpToLevel(xp);
        const progress = xpIntoLevel(xp);
        const pct = (progress / XP_PER_LEVEL) * 100;
        return (
          <div style={{ padding: '6px 16px 0', direction: 'rtl' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <span style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 10, fontWeight: 700, color: 'rgba(0,27,135,.5)' }}>المستوى {lvl}</span>
              <span style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 10, fontWeight: 700, color: 'rgba(0,27,135,.4)' }}>{progress}/{XP_PER_LEVEL} XP</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'rgba(0,27,135,.12)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: 'linear-gradient(90deg,#30E7ED,#001B87)', transition: 'width .6s ease' }} />
            </div>
          </div>
        );
      })()}

      {/* Email-unverified banner (account exists but not verified) */}
      {!accountLoading && account && !account.emailVerified && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'rgba(0,11,53,.92)', borderTop: '1.5px solid rgba(48,231,237,.2)', padding: '10px 16px', direction: 'rtl', pointerEvents: 'all' }}>
          <span style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 12, color: 'rgba(255,255,255,.55)' }}>📧 تحقق من بريدك <span style={{ color: '#30E7ED' }}>{account.email}</span> للبدء</span>
          <button onClick={async () => { await resendVerification(); setResentEmail(true); setTimeout(() => setResentEmail(false), 5000); }} style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 800, fontSize: 11, color: resentEmail ? '#38E27D' : '#30E7ED', background: 'transparent', border: '1px solid currentColor', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', flexShrink: 0, transition: 'all .2s' }}>
            {resentEmail ? 'تم الإرسال ✓' : 'إعادة الإرسال'}
          </button>
        </div>
      )}

      {/* Row 1: Settings(small) + Thirty + Classic(wide) */}
      {(() => {
        const locked = !accountLoading && (!account || !account.emailVerified);
        return (
          <>
            <div style={{ display: 'flex', gap: 9, flex: 1.1, minHeight: 0 }}>
              <MenuCard mode="settings" selected={false}             onClick={() => pick('settings')} animDelay={0}   locked={locked} />
              <MenuCard mode="thirty"   selected={sel === 'thirty'}  onClick={() => pick('thirty')}   animDelay={60}  locked={locked} />
              <MenuCard mode="classic"  selected={sel === 'classic'} onClick={() => pick('classic')}  animDelay={120} locked={locked} large />
            </div>
            <div style={{ display: 'flex', gap: 9, flex: 1, minHeight: 0 }}>
              <MenuCard mode="solo"   selected={sel === 'solo'}   onClick={() => pick('solo')}   animDelay={180} locked={locked || isFree} subLocked={isFree} />
              <MenuCard mode="guess"  selected={sel === 'guess'}  onClick={() => pick('guess')}  animDelay={230} locked={locked} />
              <MenuCard mode="wicked" selected={sel === 'wicked'} onClick={() => pick('wicked')} animDelay={280} locked={locked || isFree} subLocked={isFree} />
            </div>
          </>
        );
      })()}

      {/* Settings modal */}
      {settingsOpen && (
        <div onClick={() => setSettingsOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,11,53,.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn .2s ease both',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#001B87', borderRadius: 10, padding: '32px 36px',
            width: 340, direction: 'rtl',
            clipPath: 'polygon(0% 0%, 100% 2%, 98% 100%, 0% 100%)',
            boxShadow: '6px 6px 0 #30E7ED',
            animation: 'slideUp .3s cubic-bezier(.22,1,.36,1) both',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <img src={settingsWhite} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
              <span style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 24, color: '#F9F9F9' }}>الإعدادات</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <MusicSettingsRows />
              <SettingsRow label="اللغة" value="العربية" />
              <SettingsRow label="الإصدار" value="v2.0" />
              <div style={{ height: 1, background: 'rgba(255,255,255,.1)' }} />
              <CreditsSection />
            </div>
            <button onClick={() => setSettingsOpen(false)} style={{
              marginTop: 28, width: '100%',
              fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 16,
              background: '#30E7ED', color: '#001B87',
              border: 'none', borderRadius: 6, cursor: 'pointer',
              padding: '13px', boxShadow: '4px 4px 0 rgba(0,0,0,.3)',
            }}>إغلاق</button>
          </div>
        </div>
      )}

      {/* Faint logo watermark — bottom-left */}
      <img src={tahaddaniLogo} alt="" aria-hidden style={{
        position: 'fixed', bottom: 10, left: 14, height: 20, width: 'auto',
        opacity: 0.25, pointerEvents: 'none',
      }} />

      {/* Play Now */}
      <div style={{
        position: 'fixed', bottom: 14, right: 14, zIndex: 50,
        display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end',
        transform: sel && sel !== 'settings'
          ? 'translateX(0) rotate(-1deg)'
          : 'translateX(calc(100% + 24px))',
        transition: 'transform 0.46s cubic-bezier(0.22, 1, 0.36, 1)',
      }}>
        {sel && sel !== 'guess' && sel !== 'settings' && sel !== 'solo' && (
          <button onClick={() => handlePlay(true)} style={{
            fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 15,
            background: '#38E27D', color: '#001B87',
            border: 'none', borderRadius: 6, cursor: 'pointer',
            padding: '10px 20px',
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '4px 4px 0 rgba(0,0,0,.3)',
          }}>🌐 أونلاين</button>
        )}
        <button onClick={() => handlePlay(false)} style={{
          fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 19,
          background: '#001B87', color: '#30E7ED',
          border: 'none', borderRadius: 6, cursor: 'pointer',
          padding: '13px 28px',
          display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '5px 5px 0 #30E7ED',
        }}>
          {sel === 'guess' ? 'العب أونلاين' : sel === 'solo' ? 'العب منفرداً' : 'محلي'} <span style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 20 }}>→</span>
        </button>
      </div>
    </div>
  );
}

