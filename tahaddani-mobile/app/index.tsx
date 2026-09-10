import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAccount } from '../src/contexts/AccountContext';
import { useCoins } from '../src/contexts/CoinsContext';
import { useSub } from '../src/contexts/SubContext';
import { MenuCard } from '../src/components/MenuCard';
import { PillButton } from '../src/components/PillButton';
import { DottedBackground } from '../src/components/DottedBackground';
import { IMAGES } from '../src/theme/cards';
import type { MenuMode } from '../src/theme/cards';
import { colors, fontFamily, radii, spacing } from '../src/theme/tokens';
import { strings } from '../src/i18n';
import { CrownIcon, GlobeIcon, SparkleIcon, SpinWheelIcon } from '../src/components/icons';
import { AuthModal } from '../src/components/AuthModal';
import { SettingsModal } from '../src/components/SettingsModal';

/** Modes that offer an online match alongside the local one. */
const ONLINE_MODES: readonly MenuMode[] = ['classic', 'wicked', 'thirty'];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { account, loading: accountLoading } = useAccount();
  const { coins } = useCoins();
  const { tier } = useSub();

  const [selected, setSelected] = useState<MenuMode | null>(null);
  const [authVisible, setAuthVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const isFree = tier === 'free';
  const locked = !accountLoading && (!account || !account.emailVerified);

  const hasSelection = selected !== null && selected !== 'settings';
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: hasSelection ? 0 : 1,
      duration: 460,
      useNativeDriver: true,
    }).start();
  }, [hasSelection, slide]);

  const playTranslate = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width],
  });

  const pick = (mode: MenuMode) => {
    if (mode === 'settings') {
      setSettingsVisible(true);
      return;
    }
    setSelected((current) => (current === mode ? null : mode));
  };

  /** Anything gated behind an account routes to the auth sheet while signed out. */
  const requireAccount = (action: () => void) => () => {
    if (!account) {
      setAuthVisible(true);
      return;
    }
    action();
  };

  const showOnline = selected !== null && ONLINE_MODES.includes(selected);
  const localLabel =
    selected === 'guess' ? strings.home.playGuessOnline : selected === 'solo' ? strings.home.playSolo : strings.home.playLocal;

  return (
    <View style={styles.screen}>
      <DottedBackground />

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + spacing.sm,
            paddingBottom: insets.bottom + spacing.sm,
            paddingLeft: insets.left + spacing.md,
            paddingRight: insets.right + spacing.md,
          },
        ]}
      >
        <View style={styles.topBar}>
          <View style={styles.topGroup}>
            <PillButton
              label={strings.home.store}
              onPress={requireAccount(() => router.push('/store'))}
              leading={<Image source={IMAGES.storeNavy} style={styles.pillIcon} resizeMode="contain" />}
            />
            <Pressable
              style={styles.accountButton}
              onPress={() => setAuthVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={account ? account.name : strings.home.signup}
            >
              {account && tier === 'vip' ? <CrownIcon size={14} color={colors.gold} /> : null}
              <Text style={styles.accountLabel} numberOfLines={1}>
                {account ? account.name : strings.home.signup}
              </Text>
              {account ? null : <SparkleIcon size={13} color={colors.cyan} />}
            </Pressable>
          </View>

          <View style={styles.topGroup}>
            <PillButton
              label={strings.home.daily}
              onPress={requireAccount(() => router.push('/daily'))}
              leading={<SpinWheelIcon size={18} color={colors.navy} />}
              showDot
            />
            <PillButton label={strings.home.records} onPress={requireAccount(() => router.push('/records'))} />
            <PillButton
              label={coins.toLocaleString('en-US')}
              trailing={<Image source={IMAGES.coinNavy} style={styles.pillIcon} resizeMode="contain" />}
            />
          </View>
        </View>

        <View style={styles.row}>
          <MenuCard mode="settings" selected={false} onPress={() => pick('settings')} />
          <MenuCard mode="thirty" selected={selected === 'thirty'} onPress={locked ? () => setAuthVisible(true) : () => pick('thirty')} locked={locked} />
          <MenuCard mode="classic" selected={selected === 'classic'} onPress={locked ? () => setAuthVisible(true) : () => pick('classic')} locked={locked} large />
        </View>

        <View style={styles.row}>
          <MenuCard mode="solo" selected={selected === 'solo'} onPress={locked ? () => setAuthVisible(true) : isFree ? () => router.push('/store') : () => pick('solo')} locked={locked || isFree} subLocked={isFree} />
          <MenuCard mode="guess" selected={selected === 'guess'} onPress={locked ? () => setAuthVisible(true) : () => pick('guess')} locked={locked} />
          <MenuCard mode="wicked" selected={selected === 'wicked'} onPress={locked ? () => setAuthVisible(true) : isFree ? () => router.push('/store') : () => pick('wicked')} locked={locked || isFree} subLocked={isFree} />
        </View>
      </View>

      <Image
        source={IMAGES.logoWhite}
        style={[styles.watermarkLogo, { bottom: insets.bottom + 10, left: insets.left + 14 }]}
        resizeMode="contain"
      />

      <Animated.View
        style={[
          styles.playDock,
          { bottom: insets.bottom + 14, right: insets.right + 14, transform: [{ translateX: playTranslate }] },
        ]}
        pointerEvents={hasSelection ? 'auto' : 'none'}
      >
        {showOnline ? (
          <Pressable
            style={styles.onlineButton}
            onPress={() => selected && router.push(`/play/${selected}?online=1`)}
            accessibilityRole="button"
            accessibilityLabel={strings.home.playOnline}
          >
            <GlobeIcon size={17} color={colors.navy} />
            <Text style={styles.onlineLabel}>{strings.home.playOnline}</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={styles.localButton}
          onPress={() => selected && router.push(`/play/${selected}`)}
          accessibilityRole="button"
          accessibilityLabel={localLabel}
        >
          <Text style={styles.localLabel}>{localLabel} →</Text>
        </Pressable>
      </Animated.View>

      <AuthModal visible={authVisible} onClose={() => setAuthVisible(false)} />
      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    gap: 9,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  topGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pillIcon: {
    width: 20,
    height: 20,
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.navy,
    borderWidth: 2,
    borderColor: colors.cyan,
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 4,
    justifyContent: 'center',
    minHeight: 34,
  },
  accountLabel: {
    fontFamily: fontFamily.black,
    fontSize: 12,
    color: colors.cyan,
    maxWidth: 90,
  },
  row: {
    flexDirection: 'row',
    gap: 9,
    flex: 1,
    minHeight: 0,
  },
  watermarkLogo: {
    position: 'absolute',
    // Decorative only; must not swallow taps on the card beneath it.
    pointerEvents: 'none',
    height: 20,
    width: 90,
    opacity: 0.25,
  },
  playDock: {
    position: 'absolute',
    alignItems: 'flex-end',
    gap: spacing.sm,
    zIndex: 50,
  },
  onlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.green,
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  onlineLabel: {
    fontFamily: fontFamily.black,
    fontSize: 15,
    color: colors.navy,
  },
  localButton: {
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    paddingVertical: 13,
    paddingHorizontal: 28,
  },
  localLabel: {
    fontFamily: fontFamily.black,
    fontSize: 19,
    color: colors.cyan,
  },
});
