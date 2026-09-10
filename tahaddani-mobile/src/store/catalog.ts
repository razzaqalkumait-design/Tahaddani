import type { ComponentType } from 'react';
import type { SubTier } from '../contexts/SubContext';
import type { IconProps } from '../components/icons';
import {
  BallIcon,
  BurgerIcon,
  CrownIcon,
  FilmIcon,
  FlaskIcon,
  MapPinIcon,
  MosqueIcon,
  MusicIcon,
  PawIcon,
  StarIcon,
} from '../components/icons';

/**
 * Store catalog.
 *
 * Real-currency prices are integer minor units (US cents) and are formatted
 * only at the view layer. The web build stored these as display strings
 * ('5$'), which cannot survive arithmetic or a second currency.
 */

export type PackTier = 'free' | 'normal' | 'premium' | 'huge';

export interface QuestionPack {
  id: string;
  name: string;
  Icon: ComponentType<IconProps>;
  desc: string;
  /** Price in in-game coins, not real currency. */
  coinPrice: number;
  tier: PackTier;
  isPaid: boolean;
}

export const QUESTION_PACKS: readonly QuestionPack[] = [
  { id: 'vanilla_sports', name: 'رياضة', Icon: BallIcon, desc: 'كرة وألعاب وبطولات', coinPrice: 0, tier: 'free', isPaid: false },
  { id: 'vanilla_movies', name: 'أفلام ومسلسلات', Icon: FilmIcon, desc: 'سينما وتلفزيون عربي وعالمي', coinPrice: 0, tier: 'free', isPaid: false },
  { id: 'vanilla_animals', name: 'عالم الحيوان', Icon: PawIcon, desc: 'حيوانات وحشرات وطيور', coinPrice: 0, tier: 'free', isPaid: false },
  { id: 'vanilla_geography', name: 'جغرافيا', Icon: MapPinIcon, desc: 'دول وعواصم وأماكن', coinPrice: 0, tier: 'free', isPaid: false },
  { id: 'paid_science', name: 'علوم وتكنولوجيا', Icon: FlaskIcon, desc: 'فيزياء وكيمياء وفضاء', coinPrice: 750, tier: 'premium', isPaid: true },
  { id: 'paid_food', name: 'طعام وطبخ', Icon: BurgerIcon, desc: 'وصفات ومأكولات من حول العالم', coinPrice: 500, tier: 'normal', isPaid: true },
  { id: 'paid_music', name: 'موسيقى', Icon: MusicIcon, desc: 'أغاني وفنانين عرب وعالميين', coinPrice: 500, tier: 'normal', isPaid: true },
  { id: 'paid_history', name: 'تاريخ إسلامي', Icon: MosqueIcon, desc: 'حضارة ومعارك وشخصيات', coinPrice: 1500, tier: 'huge', isPaid: true },
];

export const PACK_TIER_LABEL: Record<PackTier, string> = {
  free: 'مجاني',
  normal: 'عادي',
  premium: 'مميز',
  huge: 'ضخم',
};

/** Optional glyph shown before a tier label. Free and normal tiers carry none. */
export const PACK_TIER_ICON: Record<PackTier, ComponentType<IconProps> | null> = {
  free: null,
  normal: null,
  premium: StarIcon,
  huge: CrownIcon,
};

export const PACK_TIER_COLOR: Record<PackTier, string> = {
  free: '#38E27D',
  normal: '#30E7ED',
  premium: '#FFD700',
  huge: '#c084fc',
};

export interface SubscriptionTier {
  id: SubTier;
  name: string;
  /** Real-money price in US cents. Never a float, never a display string. */
  priceCents: number;
  currency: 'USD';
  color: string;
  coins: number;
  BadgeIcon: ComponentType<IconProps> | null;
  perks: readonly string[];
}

export const SUB_TIERS: readonly SubscriptionTier[] = [
  {
    id: 'starter',
    name: 'المبتدئ',
    priceCents: 500,
    currency: 'USD',
    color: '#30E7ED',
    coins: 2000,
    BadgeIcon: null,
    perks: ['2,000 عملة عند الشراء', 'دخول لجميع الأنماط', 'فرصة 5% لمضاعفة العملات'],
  },
  {
    id: 'supporter',
    name: 'الداعم',
    priceCents: 1500,
    currency: 'USD',
    color: '#FFD700',
    coins: 5000,
    BadgeIcon: null,
    perks: ['5,000 عملة عند الشراء', 'بدون إعلانات', 'دخول لجميع الأنماط', '+250 عملة كل 3 مباريات'],
  },
  {
    id: 'advocate',
    name: 'المدافع',
    priceCents: 5000,
    currency: 'USD',
    color: '#c084fc',
    coins: 10000,
    BadgeIcon: null,
    perks: ['10,000 عملة عند الشراء', 'بدون إعلانات', 'دخول لجميع الأنماط', '+1,000 عملة كل 3 مباريات'],
  },
  {
    id: 'vip',
    name: 'VIP',
    priceCents: 10000,
    currency: 'USD',
    color: '#FF3D68',
    coins: 0,
    BadgeIcon: CrownIcon,
    perks: ['دخول لجميع الباقات', 'شارة VIP حصرية', 'بدون إعلانات', 'جميع مزايا المدافع'],
  },
];

/** Formats minor units for display. Formatting happens here and nowhere else. */
export function formatPrice(minorUnits: number, currency: 'USD', locale = 'ar'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: minorUnits % 100 === 0 ? 0 : 2,
  }).format(minorUnits / 100);
}

/**
 * Coin bundles shown in the store's recharge tab. Real payments go through
 * a store provider; this catalog mirrors the web build's offering.
 */
export interface CoinBundle {
  id: string;
  coins: number;
  label: string;
  priceCents: number;
  badge: string;
}

export const COIN_BUNDLES: readonly CoinBundle[] = [
  { id: 'b1', coins: 500, label: '500 عملة', priceCents: 99, badge: '' },
  { id: 'b2', coins: 1200, label: '1,200 عملة', priceCents: 199, badge: 'الأكثر مبيعاً' },
  { id: 'b3', coins: 3000, label: '3,000 عملة', priceCents: 499, badge: '+25% مجاناً' },
  { id: 'b4', coins: 7000, label: '7,000 عملة', priceCents: 999, badge: '+40% مجاناً' },
  { id: 'b5', coins: 15000, label: '15,000 عملة', priceCents: 1999, badge: 'أفضل قيمة' },
];
