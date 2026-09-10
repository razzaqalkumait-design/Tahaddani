import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BackBtn } from '../components/BackBtn';
import { colors, fontFamily, radii, spacing } from '../theme/tokens';
import { strings } from '../i18n';
import type { GameMode } from '../types';

interface ModeOption {
  mode: GameMode;
  title: string;
  sub: string;
}

/**
 * Play-shape selection for classic/wicked, ported from the web build's
 * ModeSelectScreen: teams / FFA / teams+host (host only affects the flow,
 * the host mode plays identically to teams here).
 */
export function ModeSelectScreen({
  wicked,
  onSelect,
  onBack,
}: {
  wicked: boolean;
  onSelect: (mode: GameMode) => void;
  onBack: () => void;
}) {
  const [sel, setSel] = useState<GameMode | null>(null);

  const modes: readonly ModeOption[] = wicked
    ? [
        { mode: 'wickedTeams', title: strings.game.teams, sub: strings.game.wickedTeamsSub },
        { mode: 'wickedFfa', title: strings.game.ffa, sub: strings.game.ffaSub },
        { mode: 'wickedTeamsHost', title: strings.game.teamsHost, sub: strings.game.teamsHostSub },
      ]
    : [
        { mode: 'teams', title: strings.game.teams, sub: strings.game.teamsSub },
        { mode: 'ffa', title: strings.game.ffa, sub: strings.game.ffaSub },
        { mode: 'teamsHost', title: strings.game.teamsHost, sub: strings.game.teamsHostSub },
      ];

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <BackBtn onPress={onBack} />
        <Text style={styles.headerTitle}>
          {wicked ? `😈 ${strings.game.wicked}` : `🎯 ${strings.game.normal}`} — {strings.game.modeSelect}
        </Text>
      </View>

      <View style={styles.cardsRow}>
        {modes.map((m, i) => {
          const selected = sel === m.mode;
          return (
            <Pressable
              key={m.mode}
              style={[styles.card, selected && styles.cardSelected]}
              onPress={() => setSel((s) => (s === m.mode ? null : m.mode))}
            >
              <Text style={styles.cardNumber}>{String(i + 1).padStart(2, '0')}</Text>
              <Text style={[styles.cardTitle, selected && styles.cardTitleSelected]}>{m.title}</Text>
              <Text style={[styles.cardSub, selected && styles.cardSubSelected]}>{m.sub}</Text>
              <Text style={[styles.cardCta, selected && styles.cardCtaSelected]}>SELECT →</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.dock, !sel && styles.dockHidden]}>
        <Pressable style={styles.dockBtn} onPress={() => sel && onSelect(sel)}>
          <Text style={styles.dockLabel}>
            {strings.game.playNow} <Text style={styles.dockIcon}>▶</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.md,
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
  cardsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
  },
  card: {
    flex: 1,
    backgroundColor: colors.cyan,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  cardSelected: {
    backgroundColor: colors.navy,
    borderColor: colors.cyan,
  },
  cardNumber: {
    position: 'absolute',
    bottom: -10,
    left: -6,
    fontFamily: fontFamily.black,
    fontSize: 84,
    color: 'rgba(0,27,135,.08)',
  },
  cardTitle: {
    fontFamily: fontFamily.black,
    fontSize: 24,
    color: colors.navy,
  },
  cardTitleSelected: {
    color: colors.cyan,
  },
  cardSub: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: 'rgba(0,27,135,.55)',
  },
  cardSubSelected: {
    color: 'rgba(48,231,237,.55)',
  },
  cardCta: {
    marginTop: 'auto',
    fontFamily: fontFamily.black,
    fontSize: 9,
    letterSpacing: 2,
    color: 'rgba(0,27,135,.28)',
  },
  cardCtaSelected: {
    color: 'rgba(48,231,237,.3)',
  },
  dock: {
    position: 'absolute',
    bottom: 28,
    right: 24,
  },
  dockHidden: {
    right: -400,
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
