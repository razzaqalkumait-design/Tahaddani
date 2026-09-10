import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fontFamily, radii } from '../theme/tokens';
import { strings } from '../i18n';

/**
 * Shared sub-screen back button, the native twin of the web build's BackBtn
 * (cyan pill with a hard navy offset shadow).
 */
export function BackBtn({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={strings.game.back}
      style={({ pressed }) => [styles.shadow, pressed && styles.pressed]}
    >
      <Text style={styles.label}>← {strings.game.back}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadow: {
    backgroundColor: colors.cyan,
    borderRadius: radii.md,
    paddingVertical: 9,
    paddingHorizontal: 18,
    // Hard offset shadow, RN's stand-in for `box-shadow: 4px 4px 0 #001B87`.
    shadowColor: colors.navy,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
    flexShrink: 0,
  },
  label: {
    fontFamily: fontFamily.black,
    fontSize: 15,
    color: colors.navy,
  },
  pressed: {
    opacity: 0.85,
    shadowOffset: { width: 2, height: 2 },
  },
});
