import { parseClipPolygon } from '../components/ClippedBox';
import type { ClipPoint } from '../components/ClippedBox';

export type MenuMode = 'classic' | 'thirty' | 'wicked' | 'guess' | 'solo' | 'settings';

/** Angled card silhouettes, matching CARD_CLIP in the web build. */
const CLIP_SOURCE: Record<MenuMode, string> = {
  classic: 'polygon(0% 0%, 100% 3%, 97% 100%, 0% 100%)',
  thirty: 'polygon(3% 0%, 100% 0%, 100% 100%, 0% 97%)',
  wicked: 'polygon(5% 0%, 100% 0%, 95% 100%, 0% 100%)',
  guess: 'polygon(0% 0%, 97% 0%, 100% 100%, 3% 100%)',
  settings: 'polygon(4% 2%, 100% 0%, 96% 100%, 0% 100%)',
  solo: 'polygon(0% 0%, 97% 0%, 100% 100%, 3% 100%)',
};

export const CARD_CLIP: Record<MenuMode, ClipPoint[]> = {
  classic: parseClipPolygon(CLIP_SOURCE.classic),
  thirty: parseClipPolygon(CLIP_SOURCE.thirty),
  wicked: parseClipPolygon(CLIP_SOURCE.wicked),
  guess: parseClipPolygon(CLIP_SOURCE.guess),
  settings: parseClipPolygon(CLIP_SOURCE.settings),
  solo: parseClipPolygon(CLIP_SOURCE.solo),
};

/** Skewed pill used by the top-bar buttons. */
export const PILL_CLIP: ClipPoint[] = parseClipPolygon('polygon(6% 0%, 100% 0%, 94% 100%, 0% 100%)');

export const MODE_ICONS = {
  classic: { navy: require('../assets/classic_navy.png'), white: require('../assets/classic_white.png') },
  wicked: { navy: require('../assets/wicked_navy.png'), white: require('../assets/wicked_white.png') },
  thirty: { navy: require('../assets/30_navy.png'), white: require('../assets/30_white.png') },
  guess: { navy: require('../assets/guess_navy.png'), white: require('../assets/guess_white.png') },
  settings: { navy: require('../assets/settings_navy.png'), white: require('../assets/settings_white.png') },
  solo: { navy: require('../assets/SOLO_NAVY__1_.png'), white: require('../assets/SOLO_WHITE__1_.png') },
} as const;

export const IMAGES = {
  coinNavy: require('../assets/coin-navy.png'),
  storeNavy: require('../assets/store-navy.png'),
  settingsWhite: require('../assets/settings_white.png'),
  logoWhite: require('../assets/tahaddani-white.png'),
} as const;
