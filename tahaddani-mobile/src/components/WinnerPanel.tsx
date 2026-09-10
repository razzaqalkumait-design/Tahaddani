import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, radii, spacing } from '../theme/tokens';
import { strings } from '../i18n';

/**
 * Shared end-screen winner panel, the native twin of the web build's left
 * navy panel: crown/tie emoji, winner name(s), top score, and a primary CTA.
 */
export function WinnerPanel({
  names,
  points,
  isTie,
  ctaLabel,
  onCta,
  subLabel = strings.end.point,
}: {
  /** Winner display name(s); for ties pass all tied names joined. */
  names: string;
  points: number;
  isTie: boolean;
  ctaLabel: string;
  onCta: () => void;
  subLabel?: string;
}) {
  return (
    <View style={styles.panel}>
      <Text style={styles.emoji}>{isTie ? '🤝' : '👑'}</Text>
      <Text style={styles.kicker}>{isTie ? strings.end.tie : strings.end.winner}</Text>
      <Text style={styles.name}>{names}</Text>
      <Text style={styles.points}>{points}</Text>
      <Text style={styles.pointLabel}>{subLabel}</Text>

      <View style={styles.ctaWrap}>
        <Text style={styles.ctaShadow} />
        <Text style={styles.cta} onPress={onCta}>
          {ctaLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    flex: 1,
  },
  emoji: {
    fontSize: 52,
    lineHeight: 60,
  },
  kicker: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: 'rgba(48,231,237,.55)',
    letterSpacing: 3,
  },
  name: {
    fontFamily: fontFamily.black,
    fontSize: 26,
    lineHeight: 32,
    color: colors.cyan,
    textAlign: 'center',
  },
  points: {
    fontFamily: fontFamily.black,
    fontSize: 46,
    lineHeight: 50,
    color: colors.offWhite,
  },
  pointLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: 'rgba(255,255,255,.35)',
  },
  ctaWrap: {
    marginTop: spacing.sm,
    position: 'relative',
  },
  ctaShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    opacity: 0.35,
  },
  cta: {
    backgroundColor: colors.cyan,
    color: colors.navy,
    fontFamily: fontFamily.black,
    fontSize: 15,
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: 32,
    overflow: 'hidden',
  },
});
