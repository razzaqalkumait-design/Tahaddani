import { AVATAR_FALLBACKS, AVATAR_IMAGES } from '../contexts/AccountContext';
import { useRef, useState } from 'react';

export function resolveAvatar(avatar: string): { src: string; fallback: string } {
  if (avatar.startsWith('http') || avatar.startsWith('/TAHADDANI') || avatar.startsWith('blob:')) {
    return { src: avatar, fallback: '😎' };
  }
  const idx = Number(avatar);
  return { src: AVATAR_IMAGES[idx] ?? AVATAR_IMAGES[0], fallback: AVATAR_FALLBACKS[idx] ?? '😎' };
}

export function AvatarImg({ src, fallback, size = 36, style = {} }: { src: string; fallback: string; size?: number; style?: React.CSSProperties }) {
  const [err, setErr] = useState(false);
  return err
    ? <span style={{ fontSize: size * 0.55, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, ...style }}>{fallback}</span>
    : <img src={src} alt={fallback} onError={() => setErr(true)} style={{ width: size, height: size, objectFit: 'cover', borderRadius: '50%', display: 'block', ...style }} />;
}

export function AvatarPicker({ avatarIdx, setAvatarIdx, uploadedUrl, setUploadedUrl }: {
  avatarIdx: number; setAvatarIdx: (i: number) => void;
  uploadedUrl: string | null; setUploadedUrl: (u: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadedUrl(URL.createObjectURL(f));
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      {/* Upload button */}
      <button onClick={() => fileRef.current?.click()} style={{ width: 40, height: 40, borderRadius: 10, border: uploadedUrl ? '2.5px solid #30E7ED' : '2px dashed rgba(255,255,255,.25)', background: uploadedUrl ? 'rgba(48,231,237,.15)' : 'rgba(255,255,255,.04)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', padding: 0, boxShadow: uploadedUrl ? '0 0 10px rgba(48,231,237,.4)' : 'none', transition: 'all .13s' }}>
        {uploadedUrl ? <img src={uploadedUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 18 }}>📷</span>}
      </button>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
      {/* Preset avatars */}
      {AVATAR_IMAGES.map((src, i) => (
        <button key={i} onClick={() => { setAvatarIdx(i); setUploadedUrl(null); }} style={{ width: 40, height: 40, borderRadius: 10, border: !uploadedUrl && avatarIdx === i ? '2.5px solid #30E7ED' : '2px solid rgba(255,255,255,.12)', background: !uploadedUrl && avatarIdx === i ? 'rgba(48,231,237,.15)' : 'rgba(255,255,255,.06)', cursor: 'pointer', transition: 'all .15s', boxShadow: !uploadedUrl && avatarIdx === i ? '0 0 10px rgba(48,231,237,.4)' : 'none', padding: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AvatarImg src={src} fallback={AVATAR_FALLBACKS[i]} size={36} />
        </button>
      ))}
    </div>
  );
}

