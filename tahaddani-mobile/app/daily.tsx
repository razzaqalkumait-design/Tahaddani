import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BackBtn } from '../src/components/BackBtn';
import { DailyWheelTab } from '../src/store/DailyWheelTab';
import { colors, fontFamily, spacing } from '../src/theme/tokens';
import { strings } from '../src/i18n';

export default function DailyRoute() {
  const router = useRouter();
  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <BackBtn onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <Text style={styles.headerTitle}>🎡 {strings.store.daily}</Text>
      </View>
      <DailyWheelTab />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerTitle: {
    fontFamily: fontFamily.black,
    fontSize: 20,
    color: colors.navy,
  },
});
