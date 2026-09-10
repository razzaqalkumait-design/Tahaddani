import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { colors, fontFamily, radii, spacing } from '../theme/tokens';
import { WinnerPanel } from './WinnerPanel';
import { Confetti } from './Confetti';
import { strings } from '../i18n';

export interface StandingRow {
  name: string;
  points: number;
}

export interface ResultScreenProps {
  standings: StandingRow[];
  isTie: boolean;
  winnerName: string;
  topPoints: number;
  ctaLabel: string;
  onCta: () => void;
  coinsEarned?: number;
  /** Extra widgets under the standings (round history, card reveals, ...). */
  children?: ReactNode;
}

const MEDALS = ['🥇', '🥈', '🥉'];

/**
 * Shared end-of-game screen, the native twin of the web build's EndScreen:
 * navy winner panel on one side, standings + coin reward on the other.
 */
export function ResultScreen({
  standings,
  isTie,
  winnerName,
  topPoints,
  ctaLabel,
  onCta,
  coinsEarned,
  children,
}: ResultScreenProps) {
  // Same timing as the web EndScreen: confetti 200ms after mount.
  const [confetti, setConfetti] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setConfetti(true), 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.screen}>
      <Confetti active={confetti} />
      <View style={styles.winnerSide}>
        <WinnerPanel names={winnerName} points={topPoints} isTie={isTie} ctaLabel={ctaLabel} onCta={onCta} />
      </View>

      <ScrollView style={styles.standingsSide} contentContainerStyle={styles.standingsContent}>
        <Text style={styles.finalLabel}>{strings.end.finalRanking}</Text>
        {standings.map((row, i) => {
          const highlighted = i === 0 && !isTie;
          return (
            <View
              key={`${row.name}-${i}`}
              style={[styles.standingRow, highlighted && styles.standingRowWinner]}
            >
              <Text style={styles.medal}>{MEDALS[i] ?? '🏅'}</Text>
              <Text style={[styles.standingName, highlighted && styles.standingNameWinner]} numberOfLines={1}>
                {row.name}
              </Text>
              <Text style={[styles.standingPoints, highlighted && styles.standingPointsWinner]}>{row.points}</Text>
            </View>
          );
        })}

        {coinsEarned !== undefined && (
          <View style={styles.coinRow}>
            <Text style={styles.coinLabel}>{strings.end.matchReward}</Text>
            <Text style={styles.coinValue}>
              +{coinsEarned.toLocaleString('en-US')} <Text style={styles.coinEmoji}>🪙</Text>
            </Text>
          </View>
        )}

        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  winnerSide: {
    flex: 1,
  },
  standingsSide: {
    flex: 1.4,
  },
  standingsContent: {
    padding: spacing.md,
    gap: spacing.sm,
    flexGrow: 1,
  },
  finalLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: 'rgba(0,27,135,.4)',
    letterSpacing: 2,
    marginBottom: 2,
  },
  standingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(0,27,135,.06)',
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: 'rgba(0,27,135,.1)',
    padding: spacing.md,
  },
  standingRowWinner: {
    backgroundColor: colors.navy,
    borderWidth: 0,
  },
  medal: {
    fontSize: 20,
  },
  standingName: {
    flex: 1,
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.navy,
  },
  standingNameWinner: {
    color: colors.cyan,
  },
  standingPoints: {
    fontFamily: fontFamily.black,
    fontSize: 22,
    color: 'rgba(0,27,135,.5)',
  },
  standingPointsWinner: {
    color: colors.offWhite,
  },
  coinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    backgroundColor: 'rgba(48,231,237,.10)',
    borderWidth: 1.5,
    borderColor: 'rgba(48,231,237,.3)',
    borderRadius: radii.md,
    padding: spacing.md,
  },
  coinLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: 'rgba(0,27,135,.65)',
  },
  coinValue: {
    fontFamily: fontFamily.black,
    fontSize: 18,
    color: colors.navy,
  },
  coinEmoji: {
    fontSize: 16,
  },
});
