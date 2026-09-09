// ─── XP helpers ───────────────────────────────────────
export const XP_PER_GAME = 150;
export const XP_PER_LEVEL = 500;
export const getLocalXp = () => Number(localStorage.getItem('ta_xp') || 0);
export const setLocalXp = (v: number) => localStorage.setItem('ta_xp', String(v));
export const xpToLevel = (xp: number) => Math.floor(xp / XP_PER_LEVEL) + 1;
export const xpIntoLevel = (xp: number) => xp % XP_PER_LEVEL;

