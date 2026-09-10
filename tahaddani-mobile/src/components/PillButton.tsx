import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { ClippedBox } from './ClippedBox';
import { PILL_CLIP } from '../theme/cards';
import { colors, fontFamily } from '../theme/tokens';

/**
 * The skewed cyan pill used across the top bar, with the navy hard-offset
 * shadow the web build draws via `box-shadow: 4px 4px 0`.
 *
 * The clipped shapes are painted as absolutely-positioned background layers so
 * the label and icons stay ordinary children of the Pressable. Putting content
 * inside the mask instead would hide it behind `pointerEvents="none"` and leave
 * the button with no real hit area.
 */
export function PillButton({
  label,
  onPress,
  leading,
  trailing,
  dimmed = false,
  showDot = false,
  accessibilityLabel,
}: {
  label: string;
  onPress?: () => void;
  leading?: ReactNode;
  trailing?: ReactNode;
  dimmed?: boolean;
  showDot?: boolean;
  accessibilityLabel?: string;
}) {
  const body = (
    <>
      <ClippedBox points={PILL_CLIP} style={styles.shadow} pointerEvents="none">
        <View style={styles.shadowFill} />
      </ClippedBox>
      <ClippedBox points={PILL_CLIP} style={styles.surface} pointerEvents="none">
        <View style={styles.surfaceFill} />
      </ClippedBox>
      {leading}
      <Text style={styles.label}>{label}</Text>
      {trailing}
      {showDot ? <View style={styles.dot} /> : null}
    </>
  );

  if (!onPress) {
    return <View style={[styles.pill, dimmed && styles.dimmed]}>{body}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.pill, dimmed && styles.dimmed, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingLeft: 18,
    paddingRight: 14,
    minHeight: 34,
  },
  surface: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  surfaceFill: {
    flex: 1,
    backgroundColor: colors.cyan,
  },
  shadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
  },
  shadowFill: {
    flex: 1,
    backgroundColor: colors.navy,
  },
  label: {
    fontFamily: fontFamily.black,
    fontSize: 13,
    color: colors.navy,
  },
  dot: {
    position: 'absolute',
    top: 3,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.pink,
    borderWidth: 1.5,
    borderColor: colors.cyan,
  },
  dimmed: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.85,
  },
});
