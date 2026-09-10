import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BackBtn } from '../components/BackBtn';
import { colors, fontFamily, radii, spacing } from '../theme/tokens';
import { strings } from '../i18n';
import { pickRandomGroups, playableGroups } from '../games/board';

const MIN_CATS = 2;
const MAX_CATS = 8;

/**
 * Category selection for the classic/wicked board, ported from the web
 * build's CategoriesScreen. Categories are name tiles (emoji + label); the
 * actual questions never ship in the bundle.
 */
export function CategoriesScreen({
  onConfirm,
  onBack,
}: {
  onConfirm: (groups: string[]) => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (g: string) =>
    setSelected((s) => (s.includes(g) ? s.filter((x) => x !== g) : s.length < MAX_CATS ? [...s, g] : s));

  const ready = selected.length >= MIN_CATS;

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <BackBtn onPress={onBack} />
        <Text style={styles.headerTitle}>{strings.game.selectCategories}</Text>
        <View style={[styles.counter, ready && styles.counterReady]}>
          <Text style={[styles.counterLabel, ready && styles.counterLabelReady]}>
            {selected.length} / {MAX_CATS}
          </Text>
        </View>
        <Pressable style={styles.randomBtn} onPress={() => setSelected(pickRandomGroups(6))}>
          <Text style={styles.randomLabel}>🎲 {strings.game.random}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {playableGroups.map((g) => {
          const sel = selected.includes(g);
          return (
            <Pressable key={g} style={[styles.catCell, sel && styles.catCellSelected]} onPress={() => toggle(g)}>
              <Text style={styles.catEmoji}>📌</Text>
              <Text style={[styles.catName, sel && styles.catNameSelected]} numberOfLines={2}>
                {g}
              </Text>
              {sel && (
                <View style={styles.check}>
                  <Text style={styles.checkLabel}>✓</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {ready && (
        <View style={styles.dock}>
          <Pressable style={styles.dockBtn} onPress={() => onConfirm(selected)}>
            <Text style={styles.dockLabel}>
              {strings.game.playNow} <Text style={styles.dockIcon}>▶</Text>
            </Text>
          </Pressable>
        </View>
      )}
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
  counter: {
    backgroundColor: 'rgba(0,27,135,.10)',
    borderRadius: radii.sm,
    paddingVertical: 5,
    paddingHorizontal: 14,
  },
  counterReady: {
    backgroundColor: colors.cyan,
  },
  counterLabel: {
    fontFamily: fontFamily.black,
    fontSize: 13,
    color: 'rgba(0,27,135,.45)',
  },
  counterLabelReady: {
    color: colors.navy,
  },
  randomBtn: {
    marginLeft: 'auto',
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  randomLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.cyan,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingBottom: 100,
  },
  catCell: {
    flexBasis: '18%',
    aspectRatio: 1,
    backgroundColor: '#e8eeff',
    borderRadius: radii.md,
    borderWidth: 3,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
    overflow: 'hidden',
  },
  catCellSelected: {
    borderColor: colors.cyan,
  },
  catEmoji: {
    position: 'absolute',
    top: '22%',
    fontSize: 30,
  },
  catName: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: colors.navy,
    textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,.7)',
    alignSelf: 'stretch',
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  catNameSelected: {
    backgroundColor: colors.navy,
    color: colors.offWhite,
  },
  check: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.navy,
  },
  dock: {
    position: 'absolute',
    bottom: 28,
    right: 24,
  },
  dockBtn: {
    backgroundColor: colors.cyan,
    borderRadius: radii.lg,
    paddingVertical: 16,
    paddingHorizontal: 32,
    shadowColor: colors.navy,
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  dockLabel: {
    fontFamily: fontFamily.black,
    fontSize: 18,
    color: colors.navy,
  },
  dockIcon: {
    fontSize: 22,
  },
});
