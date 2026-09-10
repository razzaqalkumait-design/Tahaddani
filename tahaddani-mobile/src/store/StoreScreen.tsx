import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Toast } from '../components/Toast';
import { colors, fontFamily, radii, spacing } from '../theme/tokens';
import { fill, strings } from '../i18n';
import { useCoins } from '../contexts/CoinsContext';
import { useSub } from '../contexts/SubContext';
import { COIN_BUNDLES, PACK_TIER_COLOR, PACK_TIER_LABEL, QUESTION_PACKS, SUB_TIERS, formatPrice } from './catalog';
import { DailyWheelTab } from './DailyWheelTab';

type StoreTab = 'packs' | 'coins' | 'sub' | 'daily';

const TAB_ORDER: readonly StoreTab[] = ['packs', 'coins', 'sub', 'daily'];

const TAB_LABELS: Record<StoreTab, string> = {
  packs: `🛍 ${strings.store.packs}`,
  coins: `🪙 ${strings.store.coins}`,
  sub: `👑 ${strings.store.subscription}`,
  daily: `🎡 ${strings.store.daily}`,
};

/**
 * Store, ported from the web build's StoreScreen: question packs (paid ones
 * cost coins), coin bundles, subscription tiers, and the daily wheel tab.
 * Real-money flows are placeholders awaiting a store provider, same as web.
 */
export function StoreScreen({ onBack }: { onBack: () => void }) {
  const { coins, spendCoins, unlockedPacks, unlockPack, addCoins, flushCoins } = useCoins();
  const { tier, setTier, removeAds, setRemoveAds } = useSub();
  const [tab, setTab] = useState<StoreTab>('packs');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  const buyPack = (pack: (typeof QUESTION_PACKS)[number]) => {
    if (!pack.isPaid) return;
    if (unlockedPacks.includes(pack.id)) return;
    if (spendCoins(pack.coinPrice)) {
      unlockPack(pack.id);
      showToast(`${strings.store.purchased} ${pack.name} ✓`);
    } else {
      showToast(strings.store.notEnoughCoins);
    }
  };

  const buyRemoveAds = () => {
    if (removeAds) return;
    // Real payment would go through the app store here (web: RevenueCat).
    setRemoveAds(true);
    addCoins(500);
    showToast(strings.store.removeAdsBought);
  };

  const buySub = (sub: (typeof SUB_TIERS)[number]) => {
    if (tier === sub.id) return;
    // Real payment would go through the app store here (web: RevenueCat).
    setTier(sub.id);
    if (sub.coins > 0) addCoins(sub.coins);
    if (sub.id === 'supporter' || sub.id === 'advocate' || sub.id === 'vip') setRemoveAds(true);
    showToast(fill(strings.store.welcomeSub, { name: sub.name }));
  };

  const buyBundle = (bundle: (typeof COIN_BUNDLES)[number]) => {
    // Demo purchase; a store provider would handle the real transaction.
    addCoins(bundle.coins);
    flushCoins();
    showToast(fill(strings.store.addedCoins, { n: bundle.coins.toLocaleString('en-US') }));
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={onBack} accessibilityRole="button" accessibilityLabel={strings.game.back}>
          <Text style={styles.backLabel}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>🛍 {strings.store.title}</Text>
        <View style={styles.coinBadge}>
          <Text style={styles.coinBadgeLabel}>🪙 {coins.toLocaleString('en-US')}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TAB_ORDER.map((t) => (
          <Pressable
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
            accessibilityRole="button"
            accessibilityLabel={TAB_LABELS[t]}
          >
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>{TAB_LABELS[t]}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {tab === 'packs' && (
          <View style={styles.tabBody}>
            {/* Remove ads */}
            <Pressable
              style={[styles.removeAdsCard, removeAds && styles.removeAdsDone]}
              onPress={buyRemoveAds}
              disabled={removeAds}
            >
              <View style={styles.removeAdsText}>
                <Text style={[styles.removeAdsTitle, removeAds && styles.removeAdsTitleDone]}>{strings.store.removeAds}</Text>
                <Text style={[styles.removeAdsSub, removeAds && styles.removeAdsSubDone]}>
                  {removeAds ? strings.store.removeAdsDone : strings.store.removeAdsGift}
                </Text>
              </View>
              {!removeAds && (
                <View style={styles.priceTag}>
                  <Text style={styles.priceTagLabel}>{formatPrice(2000, 'USD')}</Text>
                </View>
              )}
            </Pressable>

            {QUESTION_PACKS.map((pack) => {
              const Icon = pack.Icon;
              const isActive = !pack.isPaid || unlockedPacks.includes(pack.id);
              return (
                <Pressable
                  key={pack.id}
                  style={styles.packRow}
                  onPress={() => buyPack(pack)}
                  disabled={isActive}
                >
                  <View style={[styles.packIconBox, { borderColor: PACK_TIER_COLOR[pack.tier] }]}>
                    <Icon size={26} color={PACK_TIER_COLOR[pack.tier]} />
                  </View>
                  <View style={styles.packText}>
                    <Text style={styles.packName}>
                      {PACK_TIER_LABEL[pack.tier]} • {pack.name}
                    </Text>
                    <Text style={styles.packDesc}>{pack.desc}</Text>
                    {isActive ? (
                      <Text style={styles.packOwned}>✓ {pack.isPaid ? strings.store.owned : strings.store.free}</Text>
                    ) : (
                      <Text style={styles.packPrice}>🪙 {pack.coinPrice.toLocaleString('en-US')}</Text>
                    )}
                  </View>
                </Pressable>
              );
            })}

            <Pressable style={styles.restoreBtn} onPress={() => showToast(strings.store.restoring)}>
              <Text style={styles.restoreLabel}>↩ {strings.store.restore}</Text>
            </Pressable>
          </View>
        )}

        {tab === 'coins' && (
          <View style={styles.tabBody}>
            <Text style={styles.coinsIntro}>{strings.store.recharge}</Text>
            {COIN_BUNDLES.map((bundle) => (
              <Pressable key={bundle.id} style={styles.bundleRow} onPress={() => buyBundle(bundle)}>
                <View style={styles.bundleText}>
                  <Text style={styles.bundleCoins}>🪙 {bundle.coins.toLocaleString('en-US')}</Text>
                  {bundle.badge ? <Text style={styles.bundleBadge}>{bundle.badge}</Text> : null}
                </View>
                <View style={styles.bundlePrice}>
                  <Text style={styles.bundlePriceLabel}>{formatPrice(bundle.priceCents, 'USD')}</Text>
                </View>
              </Pressable>
            ))}
            <Text style={styles.demoNote}>{strings.store.paymentsDemo}</Text>
          </View>
        )}

        {tab === 'sub' && (
          <View style={styles.tabBody}>
            <Text style={styles.coinsIntro}>{strings.store.subMonthly}</Text>
            {SUB_TIERS.map((sub) => {
              const active = tier === sub.id;
              const Badge = sub.BadgeIcon;
              return (
                <Pressable
                  key={sub.id}
                  style={[styles.subRow, active && { borderColor: sub.color }]}
                  onPress={() => buySub(sub)}
                  disabled={active}
                >
                  {active && (
                    <View style={[styles.subActiveBadge, { backgroundColor: sub.color }]}>
                      <Text style={styles.subActiveLabel}>{strings.store.active}</Text>
                    </View>
                  )}
                  <View style={styles.subHeader}>
                    <View style={[styles.subPrice, { backgroundColor: sub.color }]}>
                      <Text style={styles.subPriceLabel}>
                        {formatPrice(sub.priceCents, 'USD')}
                        <Text style={styles.subPriceSuffix}>{strings.store.perMonth}</Text>
                      </Text>
                    </View>
                    <View style={styles.subNameRow}>
                      {Badge ? <Badge size={20} color={sub.color} /> : null}
                      <Text style={[styles.subName, { color: sub.color }]}>{sub.name}</Text>
                    </View>
                  </View>
                  {sub.coins > 0 && (
                    <View style={styles.subCoinsRow}>
                      <Text style={[styles.subCoinsLabel, { color: sub.color }]}>
                        🪙 +{sub.coins.toLocaleString('en-US')} {strings.store.coinsOnPurchase}
                      </Text>
                    </View>
                  )}
                  <View style={styles.perks}>
                    {sub.perks.map((perk, i) => (
                      <View key={i} style={styles.perkRow}>
                        <Text style={[styles.perkCheck, { color: sub.color }]}>✓</Text>
                        <Text style={styles.perkLabel}>{perk}</Text>
                      </View>
                    ))}
                  </View>
                </Pressable>
              );
            })}
            <Text style={styles.demoNote}>{strings.store.paymentsDemo}</Text>
          </View>
        )}

        {tab === 'daily' && <DailyWheelTab />}
      </ScrollView>

      {toast ? <Toast message={toast} onDone={() => setToast(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.navy,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backLabel: {
    color: colors.offWhite,
    fontSize: 18,
    fontWeight: '900',
  },
  headerTitle: {
    fontFamily: fontFamily.black,
    fontSize: 18,
    color: colors.offWhite,
  },
  coinBadge: {
    backgroundColor: colors.cyan,
    borderRadius: radii.md,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  coinBadgeLabel: {
    fontFamily: fontFamily.black,
    fontSize: 14,
    color: colors.navy,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.navy,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.background,
  },
  tabLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: 'rgba(255,255,255,.55)',
  },
  tabLabelActive: {
    color: colors.navy,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 80,
    gap: spacing.sm,
    flexGrow: 1,
  },
  tabBody: {
    gap: spacing.sm,
  },
  removeAdsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.navy,
    borderWidth: 2,
    borderColor: colors.cyan,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  removeAdsDone: {
    backgroundColor: 'rgba(56,226,125,.15)',
    borderColor: colors.green,
  },
  removeAdsText: {
    gap: 3,
  },
  removeAdsTitle: {
    fontFamily: fontFamily.black,
    fontSize: 15,
    color: colors.offWhite,
  },
  removeAdsTitleDone: {
    color: colors.green,
  },
  removeAdsSub: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,.55)',
  },
  removeAdsSubDone: {
    color: colors.green,
  },
  priceTag: {
    backgroundColor: colors.cyan,
    borderRadius: radii.md,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  priceTagLabel: {
    fontFamily: fontFamily.black,
    fontSize: 14,
    color: colors.navy,
  },
  packRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  packIconBox: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  packText: {
    flex: 1,
    gap: 3,
  },
  packName: {
    fontFamily: fontFamily.black,
    fontSize: 14,
    color: colors.offWhite,
  },
  packDesc: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,.55)',
  },
  packOwned: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.green,
  },
  packPrice: {
    fontFamily: fontFamily.black,
    fontSize: 13,
    color: colors.gold,
  },
  restoreBtn: {
    borderWidth: 1,
    borderColor: 'rgba(0,27,135,.2)',
    borderRadius: radii.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  restoreLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: 'rgba(0,27,135,.45)',
  },
  coinsIntro: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: 'rgba(0,27,135,.5)',
    textAlign: 'center',
    marginBottom: 2,
  },
  bundleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cyan,
    borderWidth: 2,
    borderColor: 'rgba(0,27,135,.15)',
    borderRadius: radii.md,
    padding: spacing.md,
  },
  bundleText: {
    gap: 2,
  },
  bundleCoins: {
    fontFamily: fontFamily.black,
    fontSize: 18,
    color: colors.navy,
  },
  bundleBadge: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: colors.green,
  },
  bundlePrice: {
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  bundlePriceLabel: {
    fontFamily: fontFamily.black,
    fontSize: 13,
    color: colors.cyan,
  },
  demoNote: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: 'rgba(0,27,135,.3)',
    textAlign: 'center',
    marginTop: 4,
  },
  subRow: {
    backgroundColor: colors.navy,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,.1)',
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  subActiveBadge: {
    position: 'absolute',
    top: 8,
    left: 10,
    borderRadius: radii.sm,
    paddingVertical: 2,
    paddingHorizontal: 8,
    zIndex: 2,
  },
  subActiveLabel: {
    fontFamily: fontFamily.black,
    fontSize: 9,
    color: colors.navy,
  },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subPrice: {
    borderRadius: radii.md,
    paddingVertical: 6,
    paddingHorizontal: 18,
  },
  subPriceLabel: {
    fontFamily: fontFamily.black,
    fontSize: 14,
    color: colors.navy,
  },
  subPriceSuffix: {
    fontSize: 10,
    fontFamily: fontFamily.bold,
  },
  subNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subName: {
    fontFamily: fontFamily.black,
    fontSize: 17,
  },
  subCoinsRow: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,.06)',
    borderRadius: radii.md,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  subCoinsLabel: {
    fontFamily: fontFamily.black,
    fontSize: 13,
  },
  perks: {
    gap: 4,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  perkCheck: {
    fontSize: 12,
  },
  perkLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,.7)',
  },
});
