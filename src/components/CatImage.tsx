import { useState } from 'react';

// ─── Category registry ────────────────────────────────
// To add a new category: one line here.
//   img: filename in public/images/ (without extension). null = emoji only.
//   emoji: shown while image loads or as fallback.
export const CATS: Record<string, { img: string | null; emoji: string }> = {
  'كأس العالم':          { img: 'كأس العالم',        emoji: '🏆' },
  'جغرافيا':             { img: 'جغرافيا',            emoji: '🌍' },
  'الأفلام':             { img: 'الأفلام',            emoji: '🎬' },
  'الذكاء الاصطناعي':   { img: 'الذكاء الاصطناعي',  emoji: '🤖' },
  'عالم الحيوان':        { img: 'عالم الحيوان',       emoji: '🦁' },
  'الأفلام العربية':     { img: 'الأفلام العربية',   emoji: '🎭' },
  'الموسيقى العربية':   { img: 'الموسيقى العربية',  emoji: '🎵' },
  'برشلونة':             { img: 'برشلونة',            emoji: '⚽' },
  'الدوري الألماني':     { img: 'الدوري الالماني',   emoji: '🇩🇪' },
  'قطع غيار السيارات':  { img: 'قطع السيارات',       emoji: '🔧' },
  'السيارات':            { img: 'السيارات',           emoji: '🚗' },
  'شخصيات كرتونية':     { img: 'شخصيات الكارتون',   emoji: '🎨' },
  'كريستيانو رونالدو':  { img: 'كريستيانو رونالدو', emoji: '👑' },
  'دي سي':              { img: 'دي سي',              emoji: '🦇' },
  'القواميس':            { img: 'القاموس',            emoji: '📖' },
  'الهندسة':             { img: 'الهندسة',            emoji: '⚙️' },
  'كرة القدم الأوروبية':{ img: 'اليورو',             emoji: '🏅' },
  'حقيقة أم خرافة':     { img: 'حقيقة أم خرافة',    emoji: '❓' },
  'قوانين كرة القدم':   { img: 'قوانين كرة القدم',  emoji: '📜' },
  'معلومات عامة':        { img: 'معلومات عامة',       emoji: '💡' },
  'التاريخ':             { img: 'التاريخ',            emoji: '📚' },
  'النظام الشمسي':       { img: 'النظام الشمسي',      emoji: '🪐' },
  'إسلاميات':            { img: 'اسئلة اسلامية',      emoji: '🕌' },
  'ميسي':               { img: 'ميسي',               emoji: '⭐' },
  'الموسيقى':            { img: 'الموسيقى',           emoji: '🎸' },
  'أساطير تاريخية':      { img: 'اساطير تاريخية',     emoji: '⚔️' },
  'مارفل':              { img: 'مارفيل',             emoji: '🦸' },
  'الرياضيات':           { img: 'الرياضيات',          emoji: '🔢' },
  'قادة العالم':         { img: 'رؤساء العالم',       emoji: '🌐' },
  'إكس بوكس':           { img: 'اكس بوكس',           emoji: '🎮' },
};

export function CatImage({ group, className = '', style = {} }: { group: string; className?: string; style?: React.CSSProperties }) {
  const [err, setErr] = useState(false);
  const cfg = CATS[group];
  if (err || !cfg?.img) {
    return (
      <div className="cat-emoji-fallback" style={style}>
        {cfg?.emoji ?? '📌'}
      </div>
    );
  }
  return (
    <img
      src={`/images/category/${cfg.img}.png`}
      alt={group}
      className={className}
      style={style}
      onError={() => setErr(true)}
    />
  );
}

