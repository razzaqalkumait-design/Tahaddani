import { AvatarImg, resolveAvatar } from './AvatarComponents';
import { AVATAR_FALLBACKS, AVATAR_IMAGES, AccountCtx } from '../contexts/AccountContext';
import { CoinsCtx } from '../contexts/CoinsContext';
import { NavCtx } from '../contexts/NavContext';
import coinIconWhite from '../assets/COIN_WHITE__1_.png';
import { acceptFriendRequest, cacheProfile, fetchProfile, getFriends, getFriendshipStatus, isUsernameTaken, removeFriend, searchByUsername, sendFriendRequest, sendGameInvite, supabase, updateProfile, uploadAvatar } from '../supabase';
import { validateDisplayName, validateUsername } from '../utils/profanity';
import { useContext, useEffect, useRef, useState } from 'react';
import type { FriendEntry, InviteMode } from '../supabase';

export function ProfileModal({ onClose }: { onClose: () => void }) {
  const { account, logout, refreshAccount, patchAccount } = useContext(AccountCtx);
  const { coins } = useContext(CoinsCtx);
  const [tab, setTab] = useState<'profile' | 'friends'>('profile');

  // ── Edit profile state ──
  const [editAvatar, setEditAvatar] = useState(false);
  const [avatarIdx, setAvatarIdx] = useState(() => { const n = Number(account?.avatar); return isNaN(n) ? 0 : n; });
  const [avatarUploadUrl, setAvatarUploadUrl] = useState<string | null>(null);
  const [avatarUploadFile, setAvatarUploadFile] = useState<File | null>(null);
  const profileFileRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(account?.name ?? '');
  const [username, setUsername] = useState(account?.username ?? '');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'ok' | 'taken' | 'invalid'>('idle');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const usernameAlreadySet = !!account?.username;

  // ── Friends state ──
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<import('./supabase').Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [friendStatus, setFriendStatus] = useState<Record<string, { id: string; status: string; direction: string } | null>>({});
  const [challengeTarget, setChallengeTarget] = useState<import('./supabase').FriendEntry | null>(null);
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);

  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!account?.id) return;
    getFriends(account.id).then(setFriends);
  }, [account?.id]);

  const checkUsername = (val: string) => {
    setUsername(val);
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    const clean = val.toLowerCase().trim();
    if (!clean) { setUsernameStatus('idle'); return; }
    if (!/^[a-z0-9_]{3,20}$/.test(clean)) { setUsernameStatus('invalid'); return; }
    if (validateUsername(clean)) { setUsernameStatus('invalid'); return; }
    if (clean === account?.username) { setUsernameStatus('ok'); return; }
    setUsernameStatus('checking');
    usernameTimer.current = setTimeout(async () => {
      const taken = await isUsernameTaken(clean, account?.id);
      setUsernameStatus(taken ? 'taken' : 'ok');
    }, 500);
  };

  const saveProfile = async () => {
    if (!account?.id) return;
    if (displayName.trim().length >= 2) {
      const nameErr = validateDisplayName(displayName.trim());
      if (nameErr) { setSaveMsg(nameErr); return; }
    }
    setSaving(true); setSaveMsg('');
    const fields: Record<string, string> = {};
    if (avatarUploadFile) {
      const result = await uploadAvatar(account.id, avatarUploadFile);
      if (result.url) {
        fields.avatar = result.url;
      } else {
        setSaving(false);
        setSaveMsg('فشل رفع الصورة: ' + result.error);
        return;
      }
    } else {
      fields.avatar = String(avatarIdx);
    }
    if (displayName.trim().length >= 2) fields.name = displayName.trim();
    if (!usernameAlreadySet) {
      const cleanUsername = username.toLowerCase().trim();
      if (cleanUsername && usernameStatus === 'ok') fields.username = cleanUsername;
    }
    // Keep email in sync for username-based login lookup
    if (account.email) fields.email = account.email;
    const err = await updateProfile(account.id, fields);
    setSaving(false);
    if (err) { setSaveMsg('خطأ: ' + err); console.error('[saveProfile]', err, fields); return; }
    // Update local state directly — don't re-fetch from DB (fetchProfile may fail mid-session)
    const patched = {
      name: (fields.name as string | undefined) ?? account.name,
      avatar: (fields.avatar as string | undefined) ?? account.avatar,
      username: (fields.username as string | undefined) ?? account.username,
    };
    patchAccount(patched);
    // Persist to local cache so data survives page refreshes
    cacheProfile({ id: account.id!, name: patched.name, username: patched.username ?? '', avatar: patched.avatar });
    setSaveMsg('تم الحفظ ✓');
    setEditAvatar(false);
    setAvatarUploadFile(null); setAvatarUploadUrl(null);
    setTimeout(() => setSaveMsg(''), 2000);
  };

  const doSearch = async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    const results = await searchByUsername(searchQ.trim());
    const filtered = results.filter(p => p.id !== account?.id);
    setSearchResults(filtered);
    if (account?.id) {
      const statuses: Record<string, { id: string; status: string; direction: string } | null> = {};
      await Promise.all(filtered.map(async p => {
        statuses[p.id] = await getFriendshipStatus(account.id!, p.id);
      }));
      setFriendStatus(statuses);
    }
    setSearching(false);
  };

  const sendRequest = async (addresseeId: string) => {
    if (!account?.id) return;
    await sendFriendRequest(account.id, addresseeId);
    setFriendStatus(s => ({ ...s, [addresseeId]: { id: '', status: 'pending', direction: 'sent' } }));
    getFriends(account.id).then(setFriends);
  };

  const accept = async (entry: FriendEntry) => {
    await acceptFriendRequest(entry.id);
    if (account?.id) getFriends(account.id).then(setFriends);
  };

  const remove = async (entry: FriendEntry) => {
    await removeFriend(entry.id);
    if (account?.id) getFriends(account.id).then(setFriends);
  };

  const { goTo } = useContext(NavCtx);

  const sendChallenge = async (mode: InviteMode) => {
    if (!account?.id || !challengeTarget) return;
    setInviteSending(true);
    const code = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.split('').sort(() => Math.random() - .5).slice(0, 6).join('');
    await sendGameInvite(account.id, challengeTarget.profile.id, account.name, mode, code);
    setInviteSending(false);
    onClose();
    if (mode === 'classic') goTo({ id: 'onlineClassic', wicked: false, hostCode: code });
    else if (mode === 'wicked') goTo({ id: 'onlineClassic', wicked: true, hostCode: code });
    else if (mode === 'thirty') goTo({ id: 'onlineThirty', hostCode: code });
    else if (mode === 'guess') goTo({ id: 'guessSetup', hostCode: code });
  };

  if (!account) return null;

  const { src: avatarSrc, fallback: avatarFallback } = resolveAvatar(account.avatar);

  const inpS: React.CSSProperties = { width: '100%', padding: '9px 13px', fontSize: 14, borderRadius: 9 };
  const lblS: React.CSSProperties = { fontFamily: "'Tajawal',sans-serif", fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.45)', marginBottom: 5 };

  const pendingIn = friends.filter(f => f.status === 'pending' && f.direction === 'received');
  const accepted  = friends.filter(f => f.status === 'accepted');
  const sentPending = friends.filter(f => f.status === 'pending' && f.direction === 'sent');

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(0,8,40,.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn .18s ease both' }} onClick={onClose}>

      {/* Challenge mode picker */}
      {challengeTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setChallengeTarget(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#001B87', borderRadius: 16, padding: '24px 22px', width: 'min(92vw,320px)', boxShadow: '6px 6px 0 #30E7ED', direction: 'rtl', animation: 'slideUp .25s cubic-bezier(.22,1,.36,1) both' }}>
            {!inviteSent ? (
              <>
                <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 18, color: '#F9F9F9', marginBottom: 4 }}>تحدي {challengeTarget.profile.name}</div>
                <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 12, color: 'rgba(255,255,255,.4)', marginBottom: 18 }}>اختر وضع اللعب</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {([['classic','🎯 كلاسيك'],['wicked','😈 خبيثة'],['thirty','⚡ الثلاثين'],['guess','🕵️ خمّن أسرع']] as [InviteMode,string][]).map(([m, label]) => (
                    <button key={m} onClick={() => sendChallenge(m)} disabled={inviteSending} style={{ background: 'rgba(48,231,237,.12)', border: '1.5px solid rgba(48,231,237,.3)', borderRadius: 10, padding: '13px 16px', color: '#F9F9F9', fontFamily: "'Tajawal',sans-serif", fontWeight: 800, fontSize: 15, cursor: 'pointer', textAlign: 'right', transition: 'background .15s' }}>
                      {inviteSending ? '...' : label}
                    </button>
                  ))}
                </div>
                <button onClick={() => setChallengeTarget(null)} style={{ marginTop: 14, width: '100%', background: 'transparent', border: 'none', color: 'rgba(255,255,255,.3)', fontFamily: "'Tajawal',sans-serif", fontSize: 13, cursor: 'pointer' }}>إلغاء</button>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: 42, marginBottom: 10 }}>✅</div>
                <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 16, color: '#38E27D' }}>تم إرسال التحدي!</div>
                <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 13, color: 'rgba(255,255,255,.45)', marginTop: 6 }}>بانتظار {challengeTarget.profile.name}...</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ background: '#001B87', borderRadius: 20, width: 370, maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 0 60px rgba(48,231,237,.25)', animation: 'scaleIn .25s cubic-bezier(.22,1,.36,1) both', direction: 'rtl', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '18px 20px 14px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Avatar with edit button */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ filter: 'drop-shadow(0 0 10px rgba(48,231,237,.35))', borderRadius: '50%', overflow: 'hidden' }}>
                  {(() => { const r = editAvatar && avatarUploadUrl ? { src: avatarUploadUrl, fallback: '😎' } : editAvatar ? resolveAvatar(String(avatarIdx)) : resolveAvatar(account.avatar); return <AvatarImg src={r.src} fallback={r.fallback} size={52} />; })()}
                </div>
                <button onClick={() => setEditAvatar(v => !v)} style={{ position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: '50%', background: '#30E7ED', border: '2px solid #001B87', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>✏️</button>
              </div>
              <div>
                <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 17, color: '#30E7ED' }}>{account.name}</div>
                {account.username && <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 1 }}>@{account.username}</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                  <span style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 14, color: '#FFD700' }}>{coins.toLocaleString()}</span>
                  <img src={coinIconWhite} alt="" style={{ width: 12, height: 12, objectFit: 'contain' }} />
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 8, color: 'rgba(255,255,255,.6)', fontSize: 16, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
          </div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 5, background: 'rgba(0,0,0,.22)', borderRadius: 10, padding: 3 }}>
            {(['profile', 'friends'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 13, transition: 'all .15s', background: tab === t ? '#30E7ED' : 'transparent', color: tab === t ? '#001B87' : 'rgba(255,255,255,.4)', position: 'relative' }}>
                {t === 'profile' ? 'الملف الشخصي' : 'الأصدقاء'}
                {t === 'friends' && pendingIn.length > 0 && <span style={{ position: 'absolute', top: 3, left: 6, width: 8, height: 8, borderRadius: '50%', background: '#FF3D68', display: 'block' }} />}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

          {tab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Avatar picker (expandable) */}
              {editAvatar && (
                <div style={{ background: 'rgba(0,0,0,.2)', borderRadius: 12, padding: 12 }}>
                  <div style={lblS}>الصورة الشخصية <span style={{ fontWeight: 400, opacity: .5 }}>(📷 أو اختر من القائمة)</span></div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    {/* Upload button */}
                    <button onClick={() => profileFileRef.current?.click()} style={{ width: 38, height: 38, borderRadius: 9, border: avatarUploadUrl ? '2.5px solid #30E7ED' : '2px dashed rgba(255,255,255,.25)', background: avatarUploadUrl ? 'rgba(48,231,237,.12)' : 'rgba(255,255,255,.04)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 0, boxShadow: avatarUploadUrl ? '0 0 8px rgba(48,231,237,.4)' : 'none', transition: 'all .13s', flexShrink: 0 }}>
                      {avatarUploadUrl ? <img src={avatarUploadUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 17 }}>📷</span>}
                    </button>
                    <input ref={profileFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (!f) return; setAvatarUploadFile(f); setAvatarUploadUrl(URL.createObjectURL(f)); }} />
                    {AVATAR_IMAGES.map((src, i) => (
                      <button key={i} onClick={() => { setAvatarIdx(i); setAvatarUploadUrl(null); setAvatarUploadFile(null); }} style={{ width: 38, height: 38, borderRadius: 9, border: !avatarUploadUrl && avatarIdx === i ? '2.5px solid #30E7ED' : '2px solid rgba(255,255,255,.1)', background: !avatarUploadUrl && avatarIdx === i ? 'rgba(48,231,237,.15)' : 'rgba(255,255,255,.05)', cursor: 'pointer', padding: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: !avatarUploadUrl && avatarIdx === i ? '0 0 8px rgba(48,231,237,.4)' : 'none', transition: 'all .13s' }}>
                        <AvatarImg src={src} fallback={AVATAR_FALLBACKS[i]} size={34} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Display name */}
              <div>
                <div style={lblS}>الاسم المعروض <span style={{ opacity: .5, fontWeight: 400 }}>(يمكن تغييره بحرية)</span></div>
                <input className="ta-input" value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={20} style={inpS} />
              </div>

              {/* Username */}
              <div>
                <div style={lblS}>
                  اسم المستخدم <span style={{ opacity: .5, fontWeight: 400 }}>(فريد — يُستخدم للبحث)</span>
                  {usernameAlreadySet && <span style={{ marginRight: 8, fontSize: 11, color: '#FFD700', fontWeight: 700 }}>🔒 لا يمكن تغييره</span>}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    className="ta-input"
                    value={username}
                    onChange={e => { if (!usernameAlreadySet) checkUsername(e.target.value); }}
                    maxLength={20}
                    placeholder="a-z 0-9 _"
                    disabled={usernameAlreadySet}
                    style={{ ...inpS, paddingLeft: 36, direction: 'ltr', textAlign: 'right', opacity: usernameAlreadySet ? 0.5 : 1, cursor: usernameAlreadySet ? 'not-allowed' : 'text' }}
                  />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontFamily: "'Tajawal',sans-serif", fontSize: 13, color: 'rgba(255,255,255,.35)' }}>@</span>
                  {!usernameAlreadySet && usernameStatus === 'checking' && <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12 }}>⏳</span>}
                  {!usernameAlreadySet && usernameStatus === 'ok'       && <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#38E27D' }}>✓</span>}
                  {!usernameAlreadySet && usernameStatus === 'taken'    && <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#FF3D68' }}>✗</span>}
                </div>
                {!usernameAlreadySet && usernameStatus === 'invalid' && <div style={{ fontSize: 11, color: '#FF3D68', marginTop: 4, fontFamily: "'Tajawal',sans-serif" }}>3-20 حرف: أحرف إنجليزية صغيرة وأرقام و _</div>}
                {!usernameAlreadySet && usernameStatus === 'taken'   && <div style={{ fontSize: 11, color: '#FF3D68', marginTop: 4, fontFamily: "'Tajawal',sans-serif" }}>هذا الاسم مأخوذ</div>}
              </div>

              {saveMsg && <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 12, color: saveMsg.startsWith('تم') ? '#38E27D' : '#FF3D68', textAlign: 'center', padding: '6px 0' }}>{saveMsg}</div>}

              <button onClick={saveProfile} disabled={saving || usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'checking'} style={{ background: '#30E7ED', color: '#001B87', fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 15, border: 'none', borderRadius: 11, padding: '12px 0', cursor: 'pointer', opacity: saving ? .6 : 1, transition: 'opacity .15s' }}>
                {saving ? '...' : 'حفظ التغييرات'}
              </button>

              <div style={{ height: 1, background: 'rgba(255,255,255,.08)' }} />
              <button onClick={async () => { await logout(); onClose(); }} style={{ background: 'rgba(255,61,104,.12)', color: '#FF3D68', fontFamily: "'Tajawal',sans-serif", fontWeight: 800, fontSize: 14, border: '1.5px solid rgba(255,61,104,.25)', borderRadius: 10, padding: '10px 0', cursor: 'pointer' }}>تسجيل خروج</button>
            </div>
          )}

          {tab === 'friends' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Search */}
              <div>
                <div style={lblS}>ابحث بالاسم المستخدم</div>
                <div style={{ display: 'flex', gap: 7 }}>
                  <input className="ta-input" value={searchQ} onChange={e => setSearchQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') doSearch(); }} placeholder="@username" style={{ flex: 1, padding: '9px 13px', fontSize: 14, borderRadius: 9, direction: 'ltr' }} />
                  <button onClick={doSearch} disabled={searching} style={{ background: '#30E7ED', color: '#001B87', border: 'none', borderRadius: 9, padding: '0 16px', fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>بحث</button>
                </div>
              </div>

              {searchResults.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {searchResults.map(p => {
                    const fs = friendStatus[p.id];
                    return (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(0,0,0,.2)', borderRadius: 10, padding: '9px 12px' }}>
                        {(() => { const r = resolveAvatar(p.avatar); return <AvatarImg src={r.src} fallback={r.fallback} size={34} />; })()}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 800, fontSize: 14, color: '#F9F9F9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                          <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 11, color: 'rgba(255,255,255,.35)', direction: 'ltr' }}>@{p.username}</div>
                        </div>
                        {!fs && <button onClick={() => sendRequest(p.id)} style={{ background: '#30E7ED', color: '#001B87', border: 'none', borderRadius: 7, padding: '5px 12px', fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>إضافة</button>}
                        {fs?.status === 'pending' && fs.direction === 'sent' && <span style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 11, color: 'rgba(255,255,255,.35)', flexShrink: 0 }}>بانتظار الرد</span>}
                        {fs?.status === 'accepted' && <span style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 11, color: '#38E27D', flexShrink: 0 }}>صديق ✓</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Incoming requests */}
              {pendingIn.length > 0 && (
                <div>
                  <div style={{ ...lblS, marginBottom: 8 }}>طلبات الصداقة ({pendingIn.length})</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {pendingIn.map(entry => (
                      <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(48,231,237,.06)', border: '1px solid rgba(48,231,237,.15)', borderRadius: 10, padding: '9px 12px' }}>
                        {(() => { const r = resolveAvatar(entry.profile.avatar); return <AvatarImg src={r.src} fallback={r.fallback} size={34} />; })()}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 800, fontSize: 14, color: '#F9F9F9' }}>{entry.profile.name}</div>
                          <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 11, color: 'rgba(255,255,255,.35)', direction: 'ltr' }}>@{entry.profile.username}</div>
                        </div>
                        <button onClick={() => accept(entry)} style={{ background: '#38E27D', color: '#000', border: 'none', borderRadius: 7, padding: '5px 10px', fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>قبول</button>
                        <button onClick={() => remove(entry)} style={{ background: 'rgba(255,61,104,.15)', color: '#FF3D68', border: '1px solid rgba(255,61,104,.3)', borderRadius: 7, padding: '5px 10px', fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>رفض</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Friends list */}
              {accepted.length > 0 && (
                <div>
                  <div style={lblS}>أصدقاؤك ({accepted.length})</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {accepted.map(entry => (
                      <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(0,0,0,.2)', borderRadius: 10, padding: '9px 12px' }}>
                        {(() => { const r = resolveAvatar(entry.profile.avatar); return <AvatarImg src={r.src} fallback={r.fallback} size={34} />; })()}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 800, fontSize: 14, color: '#F9F9F9' }}>{entry.profile.name}</div>
                          <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 11, color: 'rgba(255,255,255,.35)', direction: 'ltr' }}>@{entry.profile.username}</div>
                        </div>
                        <button onClick={() => { setChallengeTarget(entry); setInviteSent(false); }} style={{ background: '#30E7ED', color: '#001B87', border: 'none', borderRadius: 7, padding: '5px 10px', fontFamily: "'Tajawal',sans-serif", fontWeight: 800, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>⚔️ تحدي</button>
                        <button onClick={() => remove(entry)} style={{ background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.35)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 7, padding: '5px 10px', fontFamily: "'Tajawal',sans-serif", fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>إزالة</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sent pending */}
              {sentPending.length > 0 && (
                <div>
                  <div style={lblS}>طلبات أُرسلت</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {sentPending.map(entry => (
                      <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(0,0,0,.15)', borderRadius: 10, padding: '9px 12px' }}>
                        {(() => { const r = resolveAvatar(entry.profile.avatar); return <AvatarImg src={r.src} fallback={r.fallback} size={34} />; })()}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 800, fontSize: 14, color: '#F9F9F9' }}>{entry.profile.name}</div>
                          <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 11, color: 'rgba(255,255,255,.35)', direction: 'ltr' }}>@{entry.profile.username}</div>
                        </div>
                        <span style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 11, color: 'rgba(255,255,255,.3)', flexShrink: 0 }}>بانتظار الرد</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {friends.length === 0 && searchResults.length === 0 && (
                <div style={{ color: 'rgba(255,255,255,.25)', fontFamily: "'Tajawal',sans-serif", textAlign: 'center', padding: '24px 0', fontSize: 13 }}>ابحث عن أصدقاء بالاسم المستخدم</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

