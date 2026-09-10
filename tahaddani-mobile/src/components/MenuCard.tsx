import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ClippedBox } from './ClippedBox';
import { CARD_CLIP, MODE_ICONS } from '../theme/cards';
import type { MenuMode } from '../theme/cards';
import { cardPalette, colors, fontFamily, radii, spacing } from '../theme/tokens';
import { strings } from '../i18n';
import { CrownIcon } from './icons';

type Palette = (typeof cardPalette)[keyof typeof cardPalette];

interface MenuCardProps {
  mode: MenuMode;
  selected: boolean;
  onPress?: () => void;
  large?: boolean;
  locked?: boolean;
  subLocked?: boolean;
}

export function MenuCard({ mode, selected, onPress, large = false, locked = false, subLocked = false }: MenuCardProps) {
  const palette: Palette = locked ? cardPalette.locked : selected ? cardPalette.selected : cardPalette.idle;
  const icon = MODE_ICONS[mode];
  const iconSource = locked || selected ? icon.white : icon.navy;
  // `locked` and `subLocked` are presentation only. What a press does is the
  // caller's decision, so a locked card can still offer sign-up or the store.
  const isInteractive = onPress !== undefined;

  return (
    <Pressable
      style={[styles.wrapper, { flex: large ? 2 : 1 }]}
      onPress={onPress}
      disabled={!isInteractive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !isInteractive, selected }}
      accessibilityLabel={modeLabel(mode)}
    >
      {/* Hard offset shadow; RN has no `box-shadow: 3px 3px 0`. */}
      <ClippedBox
        points={CARD_CLIP[mode]}
        style={[styles.shadowLayer, selected ? styles.shadowSelected : styles.shadowIdle]}
        pointerEvents="none"
      >
        <View style={styles.shadowFill} />
      </ClippedBox>

      <ClippedBox points={CARD_CLIP[mode]} style={styles.clip} pointerEvents="none">
        <View style={[styles.surface, { backgroundColor: palette.bg }]}>
          <CardContent mode={mode} palette={palette} iconSource={iconSource} selected={selected} />
        </View>
      </ClippedBox>

      {subLocked ? (
        <View style={styles.subLockedBorder} pointerEvents="none">
          <View style={styles.subLockedVeil}>
            <CrownIcon size={24} color={colors.gold} />
            <Text style={styles.subLockedLabel}>{strings.home.subscribe}</Text>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

function modeLabel(mode: MenuMode): string {
  if (mode === 'settings') return strings.modes.settings.title;
  return strings.modes[mode].title;
}

function CardContent({
  mode,
  palette,
  iconSource,
  selected,
}: {
  mode: MenuMode;
  palette: Palette;
  iconSource: number;
  selected: boolean;
}) {
  if (mode === 'classic') {
    const copy = strings.modes.classic;
    return (
      <>
        <Text style={[styles.watermark, styles.classicWatermark, { color: palette.watermark }]} numberOfLines={1}>
          {copy.title}
        </Text>
        <View style={[styles.badge, { backgroundColor: selected ? colors.cyan : colors.navy }]}>
          <Text style={[styles.badgeLabel, { color: selected ? colors.navy : colors.offWhite }]}>{copy.badge}</Text>
        </View>
        <Image source={iconSource} style={styles.iconLarge} resizeMode="contain" />
        <View style={styles.classicText}>
          <Text style={[styles.latin, { color: palette.dim }]}>{copy.latin}</Text>
          <Text style={[styles.titleXl, { color: palette.fg }]}>{copy.title}</Text>
          <Text style={[styles.desc, { color: palette.dim }]}>{copy.desc}</Text>
        </View>
      </>
    );
  }

  if (mode === 'thirty') {
    const copy = strings.modes.thirty;
    return (
      <>
        <Text style={[styles.watermark, styles.thirtyWatermark, { color: palette.watermark }]}>{copy.watermark}</Text>
        <View style={styles.bottomEnd}>
          <Image source={iconSource} style={styles.iconSm} resizeMode="contain" />
          <Text style={[styles.titleMd, { color: palette.fg }]}>{copy.title}</Text>
          <Text style={[styles.desc, { color: palette.dim }]}>{copy.desc}</Text>
        </View>
      </>
    );
  }

  if (mode === 'wicked') {
    const copy = strings.modes.wicked;
    return (
      <>
        <Image source={iconSource} style={styles.iconMd} resizeMode="contain" />
        <View style={styles.bottomStart}>
          <Text style={[styles.titleSm, { color: palette.fg }]}>{copy.title}</Text>
          <Text style={[styles.desc, { color: palette.dim }]}>{copy.desc}</Text>
        </View>
      </>
    );
  }

  if (mode === 'guess') {
    const copy = strings.modes.guess;
    return (
      <>
        <Text style={[styles.watermark, styles.questionWatermark, { color: palette.watermark }]}>?</Text>
        <View style={[styles.badge, { backgroundColor: selected ? colors.cyan : colors.navy }]}>
          <Text style={[styles.badgeLabel, { color: selected ? colors.navy : colors.offWhite }]}>{copy.badge}</Text>
        </View>
        <Image source={iconSource} style={styles.iconSmTopEnd} resizeMode="contain" />
        <View style={styles.bottomEnd}>
          <Text style={[styles.titleSm, { color: palette.fg }]}>{copy.title}</Text>
          <Text style={[styles.desc, { color: palette.dim }]}>{copy.desc}</Text>
        </View>
      </>
    );
  }

  if (mode === 'solo') {
    const copy = strings.modes.solo;
    return (
      <>
        <Text style={[styles.watermark, styles.questionWatermark, { color: palette.watermark }]}>?</Text>
        <Image source={iconSource} style={styles.iconSmTopStart} resizeMode="contain" />
        <View style={styles.bottomEnd}>
          <Text style={[styles.titleSm, { color: palette.fg }]}>{copy.title}</Text>
          <Text style={[styles.desc, { color: palette.dim }]}>{copy.desc}</Text>
        </View>
      </>
    );
  }

  return (
    <View style={styles.settingsCenter}>
      <Image source={iconSource} style={styles.iconSettings} resizeMode="contain" />
      <Text style={[styles.settingsLabel, { color: palette.fg }]}>{strings.modes.settings.title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    minHeight: 0,
  },
  clip: {
    flex: 1,
    borderRadius: radii.card,
  },
  surface: {
    flex: 1,
    overflow: 'hidden',
  },
  shadowLayer: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: -3,
    bottom: -3,
    borderRadius: radii.card,
  },
  shadowIdle: {
    opacity: 0.15,
  },
  shadowSelected: {
    opacity: 0.25,
  },
  shadowFill: {
    flex: 1,
    backgroundColor: '#000000',
  },
  watermark: {
    position: 'absolute',
    fontFamily: fontFamily.black,
    includeFontPadding: false,
  },
  classicWatermark: {
    bottom: -28,
    right: -10,
    fontSize: 90,
    lineHeight: 96,
  },
  thirtyWatermark: {
    top: -18,
    left: -6,
    fontSize: 100,
    lineHeight: 106,
  },
  questionWatermark: {
    top: '22%',
    alignSelf: 'center',
    fontSize: 70,
    lineHeight: 76,
  },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radii.sm,
    zIndex: 2,
  },
  badgeLabel: {
    fontFamily: fontFamily.black,
    fontSize: 11,
  },
  iconLarge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 52,
    height: 52,
  },
  iconMd: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 36,
    height: 36,
  },
  iconSm: {
    width: 32,
    height: 32,
    marginBottom: spacing.xs,
    alignSelf: 'flex-end',
  },
  iconSmTopEnd: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
  },
  iconSmTopStart: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    width: 32,
    height: 32,
  },
  iconSettings: {
    width: 44,
    height: 44,
  },
  classicText: {
    position: 'absolute',
    bottom: 14,
    left: 14,
  },
  bottomEnd: {
    position: 'absolute',
    bottom: 14,
    right: spacing.md,
    left: spacing.md,
    alignItems: 'flex-end',
  },
  bottomStart: {
    position: 'absolute',
    bottom: 14,
    left: spacing.md,
    right: spacing.md,
    alignItems: 'flex-start',
  },
  latin: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    letterSpacing: 3,
  },
  titleXl: {
    fontFamily: fontFamily.black,
    fontSize: 32,
    lineHeight: 38,
  },
  titleMd: {
    fontFamily: fontFamily.black,
    fontSize: 18,
    lineHeight: 22,
    textAlign: 'right',
  },
  titleSm: {
    fontFamily: fontFamily.black,
    fontSize: 20,
    lineHeight: 26,
  },
  desc: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    marginTop: 3,
    textAlign: 'right',
  },
  settingsCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  settingsLabel: {
    fontFamily: fontFamily.black,
    fontSize: 13,
  },
  subLockedBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: colors.gold,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  subLockedVeil: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(0,0,0,.55)',
  },
  subLockedLabel: {
    fontFamily: fontFamily.black,
    fontSize: 10,
    color: colors.gold,
  },
});
