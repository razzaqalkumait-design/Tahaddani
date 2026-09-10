import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { BackBtn } from '../components/BackBtn';
import { colors, fontFamily, radii, spacing } from '../theme/tokens';
import { strings } from '../i18n';
import { shuffle } from '../lib/shuffle';
import type { GameMode } from '../types';

/**
 * Player/team names setup, ported from the web build's PlayersScreen: two
 * team names (or a list of FFA players) plus the random team splitter.
 */
export function PlayersScreen({
  mode,
  onConfirm,
  onBack,
}: {
  mode: GameMode;
  onConfirm: (players: string[]) => void;
  onBack: () => void;
}) {
  const isFFA = mode === 'ffa' || mode === 'wickedFfa';
  const [names, setNames] = useState(['', '']);
  const [randMode, setRandMode] = useState(false);
  const [randNames, setRandNames] = useState<string[]>(['', '']);
  const [splitResult, setSplitResult] = useState<[string[], string[]] | null>(null);

  const update = (i: number, v: string) => setNames((n) => n.map((x, idx) => (idx === i ? v : x)));
  const add = () => setNames((n) => (n.length < 8 ? [...n, ''] : n));
  const remove = (i: number) => setNames((n) => (n.length > 2 ? n.filter((_, idx) => idx !== i) : n));
  const confirm = () => {
    const valid = names.map((n) => n.trim()).filter(Boolean);
    if (valid.length < 2) return;
    onConfirm(valid);
  };

  const randUpdate = (i: number, v: string) => setRandNames((n) => n.map((x, idx) => (idx === i ? v : x)));
  const randAdd = () => setRandNames((n) => (n.length < 20 ? [...n, ''] : n));
  const randRemove = (i: number) => setRandNames((n) => (n.length > 2 ? n.filter((_, idx) => idx !== i) : n));
  const randomize = () => {
    const valid = randNames.map((n) => n.trim()).filter(Boolean);
    if (valid.length < 2) return;
    const shuffled = shuffle(valid);
    const half = Math.ceil(shuffled.length / 2);
    setSplitResult([shuffled.slice(0, half), shuffled.slice(half)]);
  };
  const confirmRand = () => {
    const [t0, t1] = splitResult ?? [];
    if (!t0 || !t1) return;
    onConfirm([t0.join(' / '), t1.join(' / ')]);
  };

  const ready = names.map((n) => n.trim()).filter(Boolean).length >= 2;
  const randReady = randNames.map((n) => n.trim()).filter(Boolean).length >= 2;

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <BackBtn onPress={onBack} />
        <Text style={styles.headerTitle}>{isFFA ? `👥 ${strings.game.playersSetup}` : `🆚 ${strings.game.teamsSetup}`}</Text>
        {!isFFA && (
          <Pressable
            style={[styles.randToggle, randMode && styles.randToggleOn]}
            onPress={() => {
              setRandMode((r) => !r);
              setSplitResult(null);
            }}
          >
            <Text style={[styles.randToggleLabel, randMode && styles.randToggleLabelOn]}>🎲 {strings.game.random}</Text>
          </Pressable>
        )}
      </View>

      {randMode && !isFFA ? (
        <View style={styles.randBody}>
          <View style={styles.randList}>
            <Text style={styles.randListTitle}>
              {strings.game.playersSetup} ({randNames.filter((n) => n.trim()).length}/20)
            </Text>
            <ScrollView contentContainerStyle={styles.randNames}>
              {randNames.map((n, i) => (
                <View key={i} style={styles.randNameRow}>
                  <TextInput
                    value={n}
                    onChangeText={(t) => randUpdate(i, t)}
                    placeholder={`${strings.game.player} ${i + 1}`}
                    placeholderTextColor="rgba(255,255,255,.35)"
                    style={styles.randInput}
                  />
                  {randNames.length > 2 && (
                    <Pressable style={styles.removeBtn} onPress={() => randRemove(i)}>
                      <Text style={styles.removeLabel}>✕</Text>
                    </Pressable>
                  )}
                </View>
              ))}
              {randNames.length < 20 && (
                <Pressable style={styles.addBtn} onPress={randAdd}>
                  <Text style={styles.addLabel}>{strings.game.addPlayer}</Text>
                </Pressable>
              )}
            </ScrollView>
          </View>

          <View style={styles.randResult}>
            {!splitResult ? (
              <Pressable style={[styles.distributeBtn, !randReady && styles.btnDisabled]} disabled={!randReady} onPress={randomize}>
                <Text style={styles.distributeLabel}>🎲 {strings.game.distribute}</Text>
              </Pressable>
            ) : (
              <>
                {[0, 1].map((ti) => {
                  const team = splitResult[ti];
                  if (!team) return null;
                  return (
                  <View key={ti} style={[styles.teamCard, ti === 0 ? styles.teamCardCyan : styles.teamCardNavy]}>
                    <Text style={[styles.teamTitle, ti === 0 ? styles.teamTitleCyan : styles.teamTitleNavy]}>
                      ● {ti === 0 ? strings.game.teamOne : strings.game.teamTwo}
                    </Text>
                    <View style={styles.teamChips}>
                      {team.map((name, i) => (
                        <View key={i} style={[styles.teamChip, ti === 0 ? styles.teamChipCyan : styles.teamChipNavy]}>
                          <Text style={[styles.teamChipLabel, ti === 0 ? styles.teamChipLabelCyan : styles.teamChipLabelNavy]}>
                            {name}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  );
                })}
                <View style={styles.randActions}>
                  <Pressable style={styles.redistributeBtn} onPress={randomize}>
                    <Text style={styles.redistributeLabel}>🔀 {strings.game.redistribute}</Text>
                  </Pressable>
                  <Pressable style={styles.confirmTeamsBtn} onPress={confirmRand}>
                    <Text style={styles.confirmTeamsLabel}>{strings.game.confirmTeams} ▶</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.mainBody}>
          {isFFA ? (
            <View style={styles.ffaCard}>
              {names.map((n, i) => (
                <View key={i} style={styles.ffaRow}>
                  <TextInput
                    value={n}
                    onChangeText={(t) => update(i, t)}
                    placeholder={`${strings.game.player} ${i + 1}`}
                    placeholderTextColor="rgba(255,255,255,.35)"
                    style={styles.ffaInput}
                  />
                  {names.length > 2 && (
                    <Pressable style={styles.removeBtn} onPress={() => remove(i)}>
                      <Text style={styles.removeLabel}>✕</Text>
                    </Pressable>
                  )}
                </View>
              ))}
              {names.length < 6 && (
                <Pressable style={styles.addBtn} onPress={add}>
                  <Text style={styles.addLabel}>{strings.game.addPlayer}</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.teamsRow}>
              {[0, 1].map((ti) => (
                <View key={ti} style={[styles.teamCard, ti === 0 ? styles.teamCardCyan : styles.teamCardNavy]}>
                  <Text style={[styles.teamTitle, ti === 0 ? styles.teamTitleCyan : styles.teamTitleNavy]}>
                    {ti === 0 ? `● ${strings.game.teamOne}` : `● ${strings.game.teamTwo}`}
                  </Text>
                  <TextInput
                    value={names[ti]}
                    onChangeText={(t) => update(ti, t)}
                    placeholder={strings.game.enterName}
                    placeholderTextColor={ti === 0 ? 'rgba(0,27,135,.4)' : 'rgba(255,255,255,.35)'}
                    style={[styles.teamInput, ti === 0 ? styles.teamInputCyan : styles.teamInputNavy]}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {ready && !randMode && (
        <View style={styles.dock}>
          <Pressable style={styles.dockBtn} onPress={confirm}>
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
  randToggle: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(0,27,135,.08)',
    borderWidth: 2,
    borderColor: 'rgba(0,27,135,.25)',
    borderRadius: radii.md,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  randToggleOn: {
    backgroundColor: colors.navy,
    borderColor: colors.cyan,
  },
  randToggleLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.navy,
  },
  randToggleLabelOn: {
    color: colors.cyan,
  },
  mainBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  teamsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
    maxWidth: 640,
  },
  teamCard: {
    flex: 1,
    borderRadius: radii.md,
    padding: spacing.xl,
    gap: spacing.md,
  },
  teamCardCyan: {
    backgroundColor: colors.cyan,
  },
  teamCardNavy: {
    backgroundColor: colors.navy,
  },
  teamTitle: {
    fontFamily: fontFamily.black,
    fontSize: 17,
  },
  teamTitleCyan: {
    color: colors.navy,
  },
  teamTitleNavy: {
    color: colors.cyan,
  },
  teamInput: {
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: 16,
    fontFamily: fontFamily.bold,
    textAlign: 'right',
  },
  teamInputCyan: {
    backgroundColor: 'rgba(255,255,255,.6)',
    color: colors.navy,
  },
  teamInputNavy: {
    backgroundColor: 'rgba(255,255,255,.12)',
    borderWidth: 2,
    borderColor: 'rgba(48,231,237,.4)',
    color: colors.offWhite,
  },
  ffaCard: {
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    padding: spacing.xl,
    gap: spacing.sm,
    width: '100%',
    maxWidth: 420,
    borderWidth: 2,
    borderColor: colors.cyan,
  },
  ffaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ffaInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(48,231,237,.3)',
    borderRadius: radii.md,
    padding: spacing.md,
    color: colors.offWhite,
    fontSize: 14,
    fontFamily: fontFamily.bold,
    textAlign: 'right',
  },
  removeBtn: {
    backgroundColor: 'rgba(255,61,104,.3)',
    borderRadius: radii.md,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  removeLabel: {
    color: colors.offWhite,
    fontSize: 12,
    fontWeight: '700',
  },
  addBtn: {
    borderWidth: 2,
    borderColor: colors.cyan,
    borderRadius: radii.md,
    paddingVertical: 11,
    alignItems: 'center',
  },
  addLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.cyan,
  },
  randBody: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
  },
  randList: {
    flex: 1,
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.cyan,
  },
  randListTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.cyan,
    marginBottom: spacing.sm,
  },
  randNames: {
    gap: spacing.sm,
  },
  randNameRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  randInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(48,231,237,.3)',
    borderRadius: radii.md,
    padding: spacing.sm,
    color: colors.offWhite,
    fontSize: 14,
    fontFamily: fontFamily.bold,
    textAlign: 'right',
  },
  randResult: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.sm,
  },
  distributeBtn: {
    backgroundColor: colors.cyan,
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: colors.navy,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  btnDisabled: {
    opacity: 0.35,
  },
  distributeLabel: {
    fontFamily: fontFamily.black,
    fontSize: 17,
    color: colors.navy,
  },
  teamChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  teamChip: {
    borderRadius: radii.md,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  teamChipCyan: {
    backgroundColor: 'rgba(0,27,135,.15)',
  },
  teamChipNavy: {
    backgroundColor: 'rgba(48,231,237,.15)',
  },
  teamChipLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
  },
  teamChipLabelCyan: {
    color: colors.navy,
  },
  teamChipLabelNavy: {
    color: colors.offWhite,
  },
  randActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  redistributeBtn: {
    flex: 1,
    backgroundColor: 'rgba(0,27,135,.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(0,27,135,.25)',
    borderRadius: radii.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  redistributeLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.navy,
  },
  confirmTeamsBtn: {
    flex: 2,
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.cyan,
  },
  confirmTeamsLabel: {
    fontFamily: fontFamily.black,
    fontSize: 14,
    color: colors.cyan,
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
