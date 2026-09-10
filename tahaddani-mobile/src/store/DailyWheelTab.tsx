import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SpinWheel } from '../components/SpinWheel';
import { Toast } from '../components/Toast';
import { colors, fontFamily, radii, spacing } from '../theme/tokens';
import { fill, strings } from '../i18n';
import { WHEEL_SEGMENTS, canClaimDaily, claimDaily } from '../lib/wheel';
import type { WheelSegment } from '../lib/wheel';
import { useCoins } from '../contexts/CoinsContext';
import { useSub } from '../contexts/SubContext';

/**
 * Daily wheel tab, shared by the store and the `/daily` route. One free spin
 * per day; rewards mirror the web build: coins, 24h pack pass, or 30 minutes
 * ad-free.
 */
export function DailyWheelTab() {
  const { addCoins, flushCoins } = useCoins();
  const { setRemoveAdsTempUntil, setAllPacksTempUntil } = useSub();
  const [dailyClaimed, setDailyClaimed] = useState(true);
  const [showWheel, setShowWheel] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    canClaimDaily().then((can) => {
      if (active) setDailyClaimed(!can);
    });
    return () => {
      active = false;
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  const handleWheelReward = (seg: WheelSegment) => {
    setShowWheel(false);
    void claimDaily().then(() => setDailyClaimed(true));
    if (seg.reward === 'coins') {
      addCoins(seg.value);
      flushCoins();
      showToast(fill(strings.store.wheelCoins, { n: String(seg.value) }));
    } else if (seg.reward === 'all_packs') {
      setAllPacksTempUntil(Date.now() + 24 * 60 * 60 * 1000);
      showToast(strings.store.wheelAllPacks);
    } else if (seg.reward === 'no_ads') {
      setRemoveAdsTempUntil(Date.now() + 30 * 60 * 1000);
      showToast(strings.store.wheelNoAds);
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.intro}>{strings.store.dailyOnce}</Text>
      <ScrollView contentContainerStyle={styles.prizes}>
        {WHEEL_SEGMENTS.map((seg, i) => (
          <View key={i} style={[styles.prizeRow, { backgroundColor: `${seg.color}18`, borderColor: `${seg.color}44` }]}>
            <Text style={styles.prizeEmoji}>{seg.emoji}</Text>
            <Text style={styles.prizeLabel}>{seg.label}</Text>
          </View>
        ))}
      </ScrollView>

      <Pressable
        style={[styles.spinBtn, dailyClaimed && styles.spinBtnDone]}
        disabled={dailyClaimed}
        onPress={() => setShowWheel(true)}
      >
        <Text style={[styles.spinLabel, dailyClaimed && styles.spinLabelDone]}>
          {dailyClaimed ? strings.store.alreadySpun : `🎡 ${strings.store.spin}`}
        </Text>
      </Pressable>
      <Text style={styles.footnote}>{dailyClaimed ? strings.store.comeBackTomorrow : strings.store.oneFreeDaily}</Text>

      {showWheel ? <SpinWheel onClose={() => setShowWheel(false)} onReward={handleWheelReward} /> : null}
      {toast ? <Toast message={toast} onDone={() => setToast(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: spacing.lg,
    alignItems: 'center',
    padding: spacing.md,
  },
  intro: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: 'rgba(0,27,135,.6)',
    textAlign: 'center',
  },
  prizes: {
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
  prizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1.5,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  prizeEmoji: {
    fontSize: 20,
  },
  prizeLabel: {
    flex: 1,
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.navy,
  },
  spinBtn: {
    backgroundColor: colors.navy,
    borderWidth: 2,
    borderColor: colors.cyan,
    borderRadius: radii.md,
    paddingVertical: 15,
    paddingHorizontal: 40,
    shadowColor: colors.cyan,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  spinBtnDone: {
    backgroundColor: 'rgba(0,27,135,.1)',
    borderWidth: 0,
    shadowOpacity: 0,
  },
  spinLabel: {
    fontFamily: fontFamily.black,
    fontSize: 16,
    color: colors.cyan,
  },
  spinLabelDone: {
    color: 'rgba(0,27,135,.35)',
  },
  footnote: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: 'rgba(0,27,135,.35)',
    textAlign: 'center',
  },
});
