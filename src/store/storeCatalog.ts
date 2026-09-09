// ─── Store ────────────────────────────────────────────
// Pack IDs: vanilla_ prefix = free base game, paid_ prefix = locked behind paywall
export const QUESTION_PACKS = [
  { id: 'vanilla_sports',    name: 'رياضة',          emoji: '⚽', desc: 'كرة وألعاب وبطولات',          price: 0,    tier: 'free',    isPaid: false },
  { id: 'vanilla_movies',    name: 'أفلام ومسلسلات', emoji: '🎬', desc: 'سينما وتلفزيون عربي وعالمي',   price: 0,    tier: 'free',    isPaid: false },
  { id: 'vanilla_animals',   name: 'عالم الحيوان',   emoji: '🦁', desc: 'حيوانات وحشرات وطيور',         price: 0,    tier: 'free',    isPaid: false },
  { id: 'vanilla_geography', name: 'جغرافيا',        emoji: '🌍', desc: 'دول وعواصم وأماكن',            price: 0,    tier: 'free',    isPaid: false },
  { id: 'paid_science',      name: 'علوم وتكنولوجيا',emoji: '🔬', desc: 'فيزياء وكيمياء وفضاء',        price: 750,  tier: 'premium', isPaid: true  },
  { id: 'paid_food',         name: 'طعام وطبخ',      emoji: '🍔', desc: 'وصفات ومأكولات من حول العالم', price: 500,  tier: 'normal',  isPaid: true  },
  { id: 'paid_music',        name: 'موسيقى',          emoji: '🎵', desc: 'أغاني وفنانين عرب وعالميين',   price: 500,  tier: 'normal',  isPaid: true  },
  { id: 'paid_history',      name: 'تاريخ إسلامي',   emoji: '🕌', desc: 'حضارة ومعارك وشخصيات',        price: 1500, tier: 'huge',    isPaid: true  },
];

export const PACK_TIER_LABEL: Record<string, string> = { free: 'مجاني', normal: 'عادي', premium: '⭐ مميز', huge: '👑 ضخم' };
export const PACK_TIER_COLOR: Record<string, string> = { free: '#38E27D', normal: '#30E7ED', premium: '#FFD700', huge: '#c084fc' };

export const SUB_TIERS = [
  { id: 'starter' as SubTier,   name: 'المبتدئ',   price: '5$',   color: '#30E7ED', coins: 2000,  badge: '',    desc: ['2,000 عملة عند الشراء', 'دخول لجميع الأنماط', 'فرصة 5% لمضاعفة العملات'] },
  { id: 'supporter' as SubTier, name: 'الداعم',    price: '15$',  color: '#FFD700', coins: 5000,  badge: '',    desc: ['5,000 عملة عند الشراء', 'بدون إعلانات', 'دخول لجميع الأنماط', '+250 عملة كل 3 مباريات'] },
  { id: 'advocate' as SubTier,  name: 'المدافع',   price: '50$',  color: '#c084fc', coins: 10000, badge: '',    desc: ['10,000 عملة عند الشراء', 'بدون إعلانات', 'دخول لجميع الأنماط', '+1,000 عملة كل 3 مباريات'] },
  { id: 'vip' as SubTier,       name: 'VIP',       price: '100$', color: '#FF3D68', coins: 0,     badge: '👑',  desc: ['دخول لجميع الباقات', 'شارة VIP حصرية', 'بدون إعلانات', 'جميع مزايا المدافع'] },
];

export const COIN_BUNDLES = [
  { id: 'b1', coins: 500,   label: '500 عملة',    price: '0.99$',  badge: '' },
  { id: 'b2', coins: 1200,  label: '1,200 عملة',  price: '1.99$',  badge: 'الأكثر مبيعاً' },
  { id: 'b3', coins: 3000,  label: '3,000 عملة',  price: '4.99$',  badge: '+25% مجاناً' },
  { id: 'b4', coins: 7000,  label: '7,000 عملة',  price: '9.99$',  badge: '+40% مجاناً' },
  { id: 'b5', coins: 15000, label: '15,000 عملة', price: '19.99$', badge: 'أفضل قيمة' },
];

