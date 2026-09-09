import { AvatarImg } from './AvatarComponents';
import { AVATAR_FALLBACKS, AVATAR_IMAGES, AccountCtx } from '../contexts/AccountContext';
import { CoinsCtx } from '../contexts/CoinsContext';
import coinIconWhite from '../assets/COIN_WHITE__1_.png';
import { isUsernameTaken, supabase } from '../supabase';
import { validateDisplayName, validateUsername } from '../utils/profanity';
import { useContext, useRef, useState } from 'react';

export function SignupModal({ onClose }: { onClose: () => void }) {
  const { signup, createProfile, loginWithEmail, refreshAccount } = useContext(AccountCtx);
  const { addCoins } = useContext(CoinsCtx);
  const [tab, setTab] = useState<'signup' | 'login'>('signup');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'ok' | 'taken' | 'invalid'>('idle');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatarIdx, setAvatarIdx] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [otpPhase, setOtpPhase] = useState(false);
  const [otp, setOtp] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [resent, setResent] = useState(false);
  const [successPhase, setSuccessPhase] = useState(false);
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', fontSize: 15, borderRadius: 10 };
  const labelStyle: React.CSSProperties = { fontFamily: "'Tajawal',sans-serif", fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.5)', marginBottom: 6 };

  const checkUsername = (val: string) => {
    setUsername(val);
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    const clean = val.toLowerCase().trim();
    if (!clean) { setUsernameStatus('idle'); return; }
    if (!/^[a-z0-9_]{3,20}$/.test(clean)) { setUsernameStatus('invalid'); return; }
    if (validateUsername(clean)) { setUsernameStatus('invalid'); return; }
    setUsernameStatus('checking');
    usernameTimer.current = setTimeout(async () => {
      const taken = await isUsernameTaken(clean);
      setUsernameStatus(taken ? 'taken' : 'ok');
    }, 500);
  };

  // sync file object when uploadedUrl changes (blob)
  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadedFile(f);
    setUploadedUrl(URL.createObjectURL(f));
  };

  const usernameOk = usernameStatus === 'ok' || usernameStatus === 'idle';
  const canSubmitSignup = name.trim().length >= 2 && username.trim().length >= 3 && usernameOk && email.includes('@') && password.length >= 6 && !saving;
  const canSubmitLogin = (email.includes('@') || email.trim().length >= 3) && password.length >= 6 && !saving;

  const handleSignup = async () => {
    if (!canSubmitSignup) return;
    const nameErr = validateDisplayName(name.trim());
    if (nameErr) { setError(nameErr); return; }
    const unErr = validateUsername(username.trim());
    if (unErr) { setError(unErr); return; }
    setSaving(true); setError('');
    const err = await signup(email.trim(), password);
    setSaving(false);
    if (err) { setError(err); return; }
    setPendingEmail(email.trim());
    setOtpPhase(true);
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 8) return;
    setSaving(true); setError('');
    const { error: otpErr } = await supabase.auth.verifyOtp({ email: pendingEmail, token: otp, type: 'signup' });
    if (otpErr) { setSaving(false); setError('الكود غير صحيح أو منتهي الصلاحية'); return; }
    const avatarVal = String(avatarIdx); // always a valid fallback; upload overwrites if it succeeds
    const profileErr = await createProfile(name.trim(), username.toLowerCase().trim(), avatarVal, uploadedFile ?? undefined);
    setSaving(false);
    if (profileErr) { setError(profileErr); return; }
    await refreshAccount();
    setSuccessPhase(true);
    setTimeout(onClose, 2600);
  };

  const handleResend = async () => {
    await supabase.auth.resend({ type: 'signup', email: pendingEmail });
    setResent(true);
    setTimeout(() => setResent(false), 4000);
  };

  const handleLogin = async () => {
    if (!canSubmitLogin) return;
    setSaving(true); setError('');
    const err = await loginWithEmail(email.trim(), password);
    setSaving(false);
    if (err) { setError(err); return; }
    onClose();
  };

  const submit = tab === 'signup' ? handleSignup : handleLogin;
  const canSubmit = tab === 'signup' ? canSubmitSignup : canSubmitLogin;

  const fileRef = useRef<HTMLInputElement>(null);

  if (successPhase) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(0,8,40,.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn .2s ease both' }}>
      <div style={{ background: '#001B87', borderRadius: 20, width: 300, display: 'flex', flexDirection: 'column', gap: 16, padding: '40px 28px', boxShadow: '0 0 80px rgba(48,231,237,.4)', animation: 'scaleIn .3s cubic-bezier(.22,1,.36,1) both', direction: 'rtl', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: 52, animation: 'popIn .5s cubic-bezier(.22,1,.36,1) both' }}>🎉</div>
        <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 22, color: '#30E7ED' }}>مرحباً {name.trim()}!</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(255,215,0,.12)', border: '1.5px solid rgba(255,215,0,.3)', borderRadius: 12, padding: '12px 24px', animation: 'popIn .5s .2s cubic-bezier(.22,1,.36,1) both' }}>
          <span style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 28, color: '#FFD700' }}>+1,000</span>
          <img src={coinIconWhite} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
        </div>
        <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 13, color: 'rgba(255,255,255,.4)' }}>هدية ترحيب — استمتع باللعب!</div>
      </div>
    </div>
  );

  if (otpPhase) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(0,8,40,.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn .2s ease both' }}>
      <div style={{ background: '#001B87', borderRadius: 20, width: 340, display: 'flex', flexDirection: 'column', gap: 20, padding: '32px 28px', boxShadow: '0 0 80px rgba(48,231,237,.3)', animation: 'scaleIn .28s cubic-bezier(.22,1,.36,1) both', direction: 'rtl', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: 44 }}>📧</div>
        <div>
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 20, color: '#30E7ED', marginBottom: 6 }}>تحقق من بريدك</div>
          <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 13, color: 'rgba(255,255,255,.45)', lineHeight: 1.6 }}>أرسلنا كود مكوّن من 6 أرقام إلى<br /><span style={{ color: 'rgba(255,255,255,.7)', direction: 'ltr', display: 'inline-block' }}>{pendingEmail}</span></div>
        </div>
        <input
          className="ta-input"
          value={otp}
          onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 8)); setError(''); }}
          onKeyDown={e => { if (e.key === 'Enter') handleVerifyOtp(); }}
          placeholder="00000000"
          maxLength={8}
          style={{ width: '100%', padding: '14px', fontSize: 28, borderRadius: 12, textAlign: 'center', letterSpacing: 10, direction: 'ltr', fontFamily: "'Tajawal',sans-serif", fontWeight: 900 }}
          autoFocus
        />
        {error && <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 12, color: '#FF3D68', background: 'rgba(255,61,104,.1)', border: '1px solid rgba(255,61,104,.3)', borderRadius: 8, padding: '8px 14px', width: '100%' }}>{error}</div>}
        <button onClick={handleVerifyOtp} disabled={otp.length !== 8 || saving} style={{ width: '100%', background: otp.length === 8 ? '#30E7ED' : 'rgba(48,231,237,.2)', color: otp.length === 8 ? '#001B87' : 'rgba(255,255,255,.3)', fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 16, border: 'none', borderRadius: 12, padding: '14px 0', cursor: otp.length === 8 ? 'pointer' : 'not-allowed', boxShadow: otp.length === 8 ? '0 0 24px rgba(48,231,237,.35)' : 'none', transition: 'all .2s' }}>
          {saving ? '...' : 'تأكيد الكود ←'}
        </button>
        <button onClick={handleResend} style={{ background: 'transparent', border: 'none', fontFamily: "'Tajawal',sans-serif", fontSize: 13, color: resent ? '#38E27D' : 'rgba(255,255,255,.35)', cursor: 'pointer', padding: '4px 0', transition: 'color .2s' }}>
          {resent ? 'تم إرسال كود جديد ✓' : 'لم يصلك الكود؟ أعد الإرسال'}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(0,8,40,.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn .2s ease both' }}>
      <div style={{ background: '#001B87', borderRadius: 20, width: 360, display: 'flex', flexDirection: 'column', gap: 16, padding: '24px 24px', boxShadow: '0 0 80px rgba(48,231,237,.3)', animation: 'scaleIn .28s cubic-bezier(.22,1,.36,1) both', direction: 'rtl', maxHeight: '92vh', overflowY: 'auto' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, background: 'rgba(0,0,0,.25)', borderRadius: 12, padding: 4 }}>
          {(['signup', 'login'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(''); }} style={{ flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 14, transition: 'all .18s', background: tab === t ? '#30E7ED' : 'transparent', color: tab === t ? '#001B87' : 'rgba(255,255,255,.45)' }}>
              {t === 'signup' ? 'حساب جديد' : 'تسجيل الدخول'}
            </button>
          ))}
        </div>

        {tab === 'signup' && (
          <>
            {/* Avatar picker */}
            <div>
              <div style={labelStyle}>الصورة الشخصية <span style={{ fontWeight: 400, opacity: .5 }}>(📷 أو اختر من القائمة)</span></div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                <button onClick={() => fileRef.current?.click()} style={{ width: 44, height: 44, borderRadius: 10, border: uploadedUrl ? '2.5px solid #30E7ED' : '2px dashed rgba(255,255,255,.25)', background: uploadedUrl ? 'rgba(48,231,237,.12)' : 'rgba(255,255,255,.04)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', padding: 0, boxShadow: uploadedUrl ? '0 0 10px rgba(48,231,237,.4)' : 'none', transition: 'all .13s' }}>
                  {uploadedUrl ? <img src={uploadedUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 20 }}>📷</span>}
                </button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarFile} />
                {AVATAR_IMAGES.map((src, i) => (
                  <button key={i} onClick={() => { setAvatarIdx(i); setUploadedUrl(null); setUploadedFile(null); }} style={{ width: 40, height: 40, borderRadius: 10, border: !uploadedUrl && avatarIdx === i ? '2.5px solid #30E7ED' : '2px solid rgba(255,255,255,.1)', background: !uploadedUrl && avatarIdx === i ? 'rgba(48,231,237,.15)' : 'rgba(255,255,255,.05)', cursor: 'pointer', transition: 'all .13s', boxShadow: !uploadedUrl && avatarIdx === i ? '0 0 8px rgba(48,231,237,.4)' : 'none', padding: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AvatarImg src={src} fallback={AVATAR_FALLBACKS[i]} size={36} />
                  </button>
                ))}
              </div>
            </div>

            {/* Display name */}
            <div>
              <div style={labelStyle}>الاسم المعروض</div>
              <input className="ta-input" value={name} onChange={e => setName(e.target.value)} placeholder="اختر اسماً مميزاً..." maxLength={20} style={inputStyle} />
            </div>

            {/* Username */}
            <div>
              <div style={labelStyle}>اسم المستخدم <span style={{ fontWeight: 400, opacity: .5 }}>(فريد — للبحث والأصدقاء)</span></div>
              <div style={{ position: 'relative' }}>
                <input className="ta-input" value={username} onChange={e => checkUsername(e.target.value)} maxLength={20} placeholder="a-z 0-9 _" style={{ ...inputStyle, paddingLeft: 32, direction: 'ltr', textAlign: 'right' }} />
                <span style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', fontFamily: "'Tajawal',sans-serif", fontSize: 14, color: 'rgba(255,255,255,.3)' }}>@</span>
                {usernameStatus === 'checking' && <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12 }}>⏳</span>}
                {usernameStatus === 'ok'      && <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#38E27D' }}>✓</span>}
                {usernameStatus === 'taken'   && <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#FF3D68' }}>✗</span>}
              </div>
              {usernameStatus === 'invalid' && <div style={{ fontSize: 11, color: '#FF3D68', marginTop: 4, fontFamily: "'Tajawal',sans-serif" }}>3-20 حرف: أحرف إنجليزية صغيرة وأرقام و _</div>}
              {usernameStatus === 'taken'   && <div style={{ fontSize: 11, color: '#FF3D68', marginTop: 4, fontFamily: "'Tajawal',sans-serif" }}>هذا الاسم مأخوذ، جرّب غيره</div>}
            </div>
          </>
        )}

        {/* Email or username */}
        <div>
          <div style={labelStyle}>{tab === 'login' ? 'البريد الإلكتروني أو اسم المستخدم' : 'البريد الإلكتروني'}</div>
          <input className="ta-input" type={tab === 'login' ? 'text' : 'email'} value={email} onChange={e => setEmail(e.target.value)} placeholder={tab === 'login' ? 'email أو @username' : 'example@email.com'} style={{ ...inputStyle, direction: 'ltr', textAlign: 'right' }} />
        </div>

        {/* Password */}
        <div>
          <div style={labelStyle}>كلمة المرور {tab === 'signup' && <span style={{ fontWeight: 400, opacity: .6 }}>(6 أحرف على الأقل)</span>}</div>
          <input className="ta-input" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && canSubmit) submit(); }} placeholder="••••••••" style={{ ...inputStyle, direction: 'ltr', textAlign: 'right' }} />
        </div>

        {error && <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 12, color: '#FF3D68', background: 'rgba(255,61,104,.1)', border: '1px solid rgba(255,61,104,.3)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>{error}</div>}

        <button onClick={submit} disabled={!canSubmit} style={{ background: canSubmit ? '#30E7ED' : 'rgba(48,231,237,.2)', color: canSubmit ? '#001B87' : 'rgba(255,255,255,.3)', fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 16, border: 'none', borderRadius: 12, padding: '14px 0', cursor: canSubmit ? 'pointer' : 'not-allowed', boxShadow: canSubmit ? '4px 4px 0 rgba(0,0,0,.25), 0 0 30px rgba(48,231,237,.35)' : 'none', clipPath: 'polygon(3% 0%, 97% 0%, 100% 100%, 0% 100%)', transition: 'all .2s' }}>
          {saving ? '...' : tab === 'signup' ? 'أنشئ الحساب ←' : 'ادخل ←'}
        </button>
      </div>
    </div>
  );
}

