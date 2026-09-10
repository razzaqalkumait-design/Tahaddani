/** Design tokens taken from the web build. */
export const colors = {
  /** Page background: white with a dotted navy grid over it. */
  background: '#FFFFFF',
  dot: 'rgba(0, 27, 135, 0.10)',
  navy: '#001B87',
  cyan: '#30E7ED',
  offWhite: '#F9F9F9',
  gold: '#FFD700',
  green: '#38E27D',
  pink: '#FF3D68',
  purple: '#c084fc',
  overlay: 'rgba(0, 11, 53, 0.75)',
  shadow: 'rgba(0, 0, 0, 0.15)',
  shadowStrong: 'rgba(0, 0, 0, 0.25)',
} as const;

/** Foreground sets for a card, keyed by its visual state. */
export const cardPalette = {
  idle: { bg: colors.cyan, fg: colors.navy, dim: 'rgba(0,27,135,.4)', watermark: 'rgba(0,27,135,.1)' },
  selected: { bg: colors.navy, fg: colors.offWhite, dim: 'rgba(249,249,249,.35)', watermark: 'rgba(48,231,237,.1)' },
  locked: { bg: colors.navy, fg: 'rgba(255,255,255,.18)', dim: 'rgba(255,255,255,.08)', watermark: 'rgba(255,255,255,.04)' },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const radii = {
  sm: 4,
  md: 6,
  lg: 8,
  card: 12,
} as const;

/** Tajawal weights used across the app. */
export const fontFamily = {
  regular: 'Tajawal_400Regular',
  medium: 'Tajawal_500Medium',
  bold: 'Tajawal_700Bold',
  black: 'Tajawal_900Black',
} as const;
