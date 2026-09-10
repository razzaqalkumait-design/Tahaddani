import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, radii, spacing } from '../theme/tokens';

/**
 * The board-game question card: category + point badges above a navy panel
 * with the question text. Badge styles (double/steal/2x) mirror the web build.
 */
export function QuestionPanel({
  group,
  points,
  question,
  doubled = false,
  stoleBy,
  showTwo = false,
}: {
  group: string;
  points: number;
  question: string;
  doubled?: boolean;
  stoleBy?: string;
  showTwo?: boolean;
}) {
  const ptsColor = doubled ? colors.pink : colors.cyan;
  return (
    <View style={styles.container}>
      <View style={styles.badgeRow}>
        <View style={styles.groupBadge}>
          <Text style={styles.groupText} numberOfLines={1}>
            {group}
          </Text>
        </View>
        <View style={[styles.pointsBadge, { backgroundColor: ptsColor }]}>
          <Text style={styles.pointsText}>{doubled ? `🔥 ${points * 2}` : points}</Text>
        </View>
        {stoleBy ? (
          <View style={styles.stealBadge}>
            <Text style={styles.stealText}>🦊 {stoleBy}</Text>
          </View>
        ) : null}
        {showTwo ? (
          <View style={styles.twoBadge}>
            <Text style={styles.twoText}>2️⃣</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.question}>{question}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  groupBadge: {
    backgroundColor: colors.navy,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    maxWidth: '60%',
  },
  groupText: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: colors.cyan,
  },
  pointsBadge: {
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  pointsText: {
    fontFamily: fontFamily.black,
    fontSize: 14,
    color: colors.navy,
  },
  stealBadge: {
    backgroundColor: 'rgba(255,61,104,.15)',
    borderWidth: 1,
    borderColor: colors.pink,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stealText: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: colors.pink,
  },
  twoBadge: {
    backgroundColor: 'rgba(48,231,237,.1)',
    borderWidth: 1,
    borderColor: colors.cyan,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  twoText: {
    fontSize: 12,
  },
  card: {
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.cyan,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  question: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    lineHeight: 30,
    color: colors.offWhite,
    textAlign: 'center',
  },
});
