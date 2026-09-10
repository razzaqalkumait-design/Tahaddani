import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamily, radii, spacing } from '../theme/tokens';
import { strings } from '../i18n';

/**
 * Placeholder for a screen that exists in the web build but has not been
 * ported yet. Deliberately explicit so an unfinished route is never mistaken
 * for a broken one.
 */
export function PendingScreen({ name }: { name: string }) {
  // canGoBack guards a deep link opened straight into this route, where the
  // stack is empty and router.back() would be a no-op.
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Text style={styles.badge}>{strings.pending.title}</Text>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.body}>{strings.pending.body}</Text>
      <Pressable
        style={styles.back}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        accessibilityRole="button"
        accessibilityLabel={strings.pending.back}
      >
        <Text style={styles.backLabel}>{strings.pending.back}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  // No letterSpacing: Arabic is a connected script and spacing breaks its ligatures.
  badge: { fontFamily: fontFamily.bold, fontSize: 12, color: colors.cyan },
  name: { fontFamily: fontFamily.black, fontSize: 30, color: colors.navy },
  body: { fontFamily: fontFamily.regular, fontSize: 14, color: 'rgba(0,27,135,.55)', textAlign: 'center' },
  back: {
    marginTop: spacing.md,
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    paddingVertical: 13,
    paddingHorizontal: spacing.xl,
  },
  backLabel: { fontFamily: fontFamily.black, fontSize: 16, color: colors.cyan },
});
