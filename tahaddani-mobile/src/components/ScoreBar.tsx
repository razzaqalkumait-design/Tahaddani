import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, spacing } from '../theme/tokens';
import { strings } from '../i18n';

export interface ScoreEntry {
  key: string;
  name: string;
  points: number;
  /** Seat or team index; the active side is highlighted cyan. */
  side: 0 | 1;
  active: boolean;
  answering: boolean;
}

/**
 * The two-team score bar shown across the classic/wicked board. The web build
 * paints side 1 in cyan and side 2 in navy; the center cell carries the turn
 * label and any trailing controls.
 */
export function ScoreBar({ entries, center }: { entries: ScoreEntry[]; center: React.ReactNode }) {
  const left = entries.find((e) => e.side === 0);
  const right = entries.find((e) => e.side === 1);

  return (
    <View style={styles.bar}>
      <View style={[styles.team, styles.teamCyan]}>
        {left ? <ScoreSide entry={left} align="flex-start" /> : null}
      </View>

      <View style={styles.center}>{center}</View>

      <View style={[styles.team, styles.teamNavy]}>
        {right ? <ScoreSide entry={right} align="flex-end" /> : null}
      </View>
    </View>
  );
}

function ScoreSide({ entry, align }: { entry: ScoreEntry; align: 'flex-start' | 'flex-end' }) {
  const lit = entry.active || entry.answering;
  return (
    <View style={[styles.side, { alignItems: align }]}>
      <Text style={[styles.name, lit && styles.nameLit]} numberOfLines={1}>
        {entry.name}
      </Text>
      <Text style={[styles.points, lit && styles.pointsLit]}>{entry.points}</Text>
    </View>
  );
}

/** Turn label shown in the score-bar center, matching the web build's copy. */
export function TurnLabel({ name }: { name: string }) {
  return (
    <View style={styles.turnBox}>
      <Text style={styles.turnName} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.turnSub}>{strings.game.yourTurn}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 64,
    backgroundColor: colors.background,
  },
  team: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  teamCyan: {
    backgroundColor: colors.cyan,
  },
  teamNavy: {
    backgroundColor: colors.navy,
  },
  side: {
    gap: 2,
  },
  name: {
    fontFamily: fontFamily.black,
    fontSize: 13,
    color: 'rgba(0,0,0,.55)',
    textAlign: 'right',
    maxWidth: '100%',
  },
  nameLit: {
    color: colors.navy,
  },
  points: {
    fontFamily: fontFamily.black,
    fontSize: 26,
    lineHeight: 30,
    color: colors.navy,
  },
  pointsLit: {
    color: colors.navy,
  },
  center: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  turnBox: {
    alignItems: 'center',
  },
  turnName: {
    fontFamily: fontFamily.black,
    fontSize: 11,
    color: colors.cyan,
    maxWidth: 90,
  },
  turnSub: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: 'rgba(48,231,237,.65)',
  },
});
