/** XP helpers, ported from the web build's `src/lib/xp.ts`. */
export const XP_PER_GAME = 150;
export const XP_PER_LEVEL = 500;

export const xpToLevel = (xp: number): number => Math.floor(xp / XP_PER_LEVEL) + 1;
export const xpIntoLevel = (xp: number): number => xp % XP_PER_LEVEL;
