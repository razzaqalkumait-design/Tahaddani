import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { BackBtn } from '../components/BackBtn';
import { colors, fontFamily, radii, spacing } from '../theme/tokens';
import { strings } from '../i18n';
import { getRecords } from '../lib/records';
import type { GameRecord } from '../lib/records';

/**
 * Records screen — the native twin of the web build's RecordsOverlay, shown
 * as a full route here. Lists finished matches (most recent first, max 50).
 */
export function RecordsScreen({ onBack }: { onBack: () => void }) {
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void getRecords().then((r) => {
      if (!active) return;
      setRecords(r);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <BackBtn onPress={onBack} />
        <Text style={styles.headerTitle}>{strings.records.title}</Text>
      </View>

      {!loaded ? null : (
        <FlatList
          data={records}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyLabel}>{strings.records.empty}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.recordCard}>
              <View style={styles.recordTop}>
                <Text style={styles.recordMode}>{item.mode}</Text>
                <Text style={styles.recordTime}>{item.time}</Text>
              </View>
              <View style={styles.scoresRow}>
                {item.scores.map((s, i) => (
                  <View key={i} style={styles.scoreChip}>
                    <Text style={styles.scoreName}>{s.name}</Text>
                    <Text style={styles.scorePts}>{s.pts}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        />
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
  list: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingBottom: 60,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: 'rgba(0,27,135,.3)',
  },
  recordCard: {
    backgroundColor: colors.navy,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: 6,
  },
  recordTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordMode: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: 'rgba(48,231,237,.7)',
    backgroundColor: 'rgba(48,231,237,.08)',
    borderRadius: radii.sm,
    paddingVertical: 2,
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  recordTime: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,.35)',
  },
  scoresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scoreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,27,135,.5)',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  scoreName: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.offWhite,
  },
  scorePts: {
    fontFamily: fontFamily.black,
    fontSize: 15,
    color: colors.cyan,
  },
});
