import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { TimerRing } from '../components/TimerRing';
import { colors, fontFamily, radii, spacing } from '../theme/tokens';
import { strings } from '../i18n';
import { SOLO_TIMER_SECS, pickFromPool } from '../games/solo';
import { shuffle } from '../lib/shuffle';
import { fetchSoloQuestions } from '../api';
import { useAccount } from '../contexts/AccountContext';
import { useCoins } from '../contexts/CoinsContext';
import type { SoloQuestion } from '../api';

type SoloPhase = 'setup' | 'loading' | 'playing' | 'wrong' | 'end';

const TIER_COLORS = ['#30E7ED', '#38E27D', '#FFD700', '#FF9A3C', '#FF3D68'] as const;

/**
 * Solo mode, ported from the web build's SoloGame: name setup, escalating
 * question tiers every 5 streak, 15-second timer, 2x2 answer grid, and a
 * streak × 2 coin reward on a miss.
 */
export function SoloGameScreen({ onBack }: { onBack: () => void }) {
  const { account } = useAccount();
  const { addCoins, flushCoins } = useCoins();

  const [phase, setPhase] = useState<SoloPhase>('setup');
  const [playerName, setPlayerName] = useState(() => account?.name ?? '');
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [q, setQ] = useState<SoloQuestion | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(SOLO_TIMER_SECS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const usedQs = useRef<Set<string>>(new Set());
  const soloPool = useRef<SoloQuestion[]>([]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const loadQ = useCallback((newStreak: number) => {
    const next = pickFromPool(soloPool.current, newStreak, usedQs.current);
    if (!next) return;
    usedQs.current.add(next.question);
    setQ(next);
    setChoices(shuffle([...next.wrong, next.answer]));
    setSelected(null);
    setTimeLeft(SOLO_TIMER_SECS);
  }, []);

  // Countdown while playing.
  useEffect(() => {
    if (phase !== 'playing' || selected !== null) return;
    stopTimer();
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          stopTimer();
          setPhase('wrong');
          setBest((b) => Math.max(b, streak));
          if (streak > 0) {
            addCoins(streak * 2);
            flushCoins();
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return stopTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, selected, q]);

  const startSolo = async () => {
    setPhase('loading');
    try {
      const questions = await fetchSoloQuestions(null, 200);
      soloPool.current = questions;
      usedQs.current.clear();
      setStreak(0);
      loadQ(0);
      setPhase('playing');
    } catch {
      setPhase('setup');
    }
  };

  const answer = (choice: string) => {
    if (selected || phase !== 'playing' || !q) return;
    stopTimer();
    setSelected(choice);
    if (choice === q.answer) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setBest((b) => Math.max(b, newStreak));
      setTimeout(() => loadQ(newStreak), 700);
    } else {
      setPhase('wrong');
      setBest((b) => Math.max(b, streak));
      if (streak > 0) {
        addCoins(streak * 2);
        flushCoins();
      }
    }
  };

  const restart = () => {
    usedQs.current.clear();
    setStreak(0);
    setSelected(null);
    setTimeLeft(SOLO_TIMER_SECS);
    loadQ(0);
    setPhase('playing');
  };

  const tier = Math.min(5, Math.floor(streak / 5) + 1);
  const tierColor = TIER_COLORS[tier - 1] ?? TIER_COLORS[0]!;

  if (phase === 'loading') {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.spinner} />
        <Text style={styles.loadingLabel}>{strings.game.loadingQuestions}</Text>
      </View>
    );
  }

  if (phase === 'setup') {
    const canStart = playerName.trim().length > 0;
    return (
      <View style={styles.centeredScreen}>
        <View style={styles.setupCard}>
          <Text style={styles.setupTitle}>🎯 {strings.solo.title}</Text>
          <Text style={styles.setupSub}>{strings.solo.subtitle}</Text>
          <Text style={styles.nameLabel}>{strings.solo.nameLabel}</Text>
          <TextInput
            value={playerName}
            onChangeText={setPlayerName}
            placeholder={strings.game.enterNames}
            placeholderTextColor="rgba(255,255,255,.35)"
            maxLength={20}
            style={styles.input}
            autoFocus
          />
          <View style={styles.setupButtons}>
            <Pressable
              style={[styles.startBtn, !canStart && styles.btnDisabled]}
              disabled={!canStart}
              onPress={() => void startSolo()}
            >
              <Text style={styles.startBtnLabel}>{strings.game.start} ←</Text>
            </Pressable>
            <Pressable style={styles.setupBackBtn} onPress={onBack}>
              <Text style={styles.setupBackLabel}>{strings.game.back}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  if (phase === 'wrong' || phase === 'end') {
    const earned = streak * 2;
    return (
      <View style={styles.resultScreen}>
        <View style={styles.streakCard}>
          <Text style={styles.streakValue}>{streak}</Text>
          <Text style={styles.streakLabel}>{strings.solo.streak}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{best}</Text>
              <Text style={styles.statLabel}>{strings.solo.best}</Text>
            </View>
            {earned > 0 && (
              <View style={styles.statCell}>
                <Text style={styles.statValue}>+{earned} 🪙</Text>
                <Text style={styles.statLabel}>{strings.solo.coins}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.resultBody}>
          <Text style={styles.resultTitle}>
            {selected === null ? `⏰ ${strings.solo.timeout}` : `💥 ${strings.solo.wrongAnswer}`}
          </Text>
          <View style={styles.answerCard}>
            <Text style={styles.answerKicker}>{strings.game.correctAnswer}</Text>
            <Text style={styles.answerText}>{q?.answer}</Text>
          </View>
          <View style={styles.setupButtons}>
            <Pressable style={styles.startBtn} onPress={restart}>
              <Text style={styles.startBtnLabel}>{strings.solo.again} ↺</Text>
            </Pressable>
            <Pressable style={styles.setupBackBtn} onPress={onBack}>
              <Text style={styles.setupBackLabel}>{strings.solo.home}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  if (!q) return null;

  return (
    <View style={styles.playScreen}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSide}>
          <Text style={styles.headerBig}>{streak}</Text>
          <Text style={styles.headerSmall}>{strings.solo.streak}</Text>
          {playerName ? <Text style={styles.headerName}>{playerName}</Text> : null}
        </View>
        <View style={styles.headerCenter}>
          <View style={[styles.tierBadge, { backgroundColor: `${tierColor}22` }]}>
            <Text style={[styles.tierLabel, { color: tierColor }]}>
              {strings.solo.level} {tier}
            </Text>
          </View>
          <TimerRing timeLeft={timeLeft} total={SOLO_TIMER_SECS} urgentColor="#FF3D68" />
        </View>
        <View style={styles.headerSideEnd}>
          <Text style={[styles.headerBig, styles.bestValue]}>{best}</Text>
          <Text style={styles.headerSmall}>{strings.solo.best}</Text>
        </View>
      </View>

      {/* Question */}
      <View style={styles.questionArea}>
        <Text style={styles.questionText}>{q.question}</Text>
      </View>

      {/* Choices */}
      <View style={styles.choicesGrid}>
        {choices.map((c, i) => {
          const isCorrect = c === q.answer;
          const isSelected = c === selected;
          const revealed = selected !== null;
          let bg: string = colors.navy;
          let border: string = 'transparent';
          let txt: string = colors.offWhite;
          if (revealed && isCorrect) {
            bg = 'rgba(56,226,125,.15)';
            border = colors.green;
            txt = '#1a6b3c';
          } else if (revealed && isSelected && !isCorrect) {
            bg = 'rgba(255,61,104,.12)';
            border = colors.pink;
            txt = '#c0002a';
          }
          return (
            <Pressable key={i} style={[styles.choiceBtn, { backgroundColor: bg, borderColor: border }]} onPress={() => answer(c)}>
              <Text style={[styles.choiceText, { color: txt }]}>{c}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centeredScreen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  spinner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 4,
    borderColor: 'rgba(0,27,135,.15)',
    borderTopColor: colors.navy,
  },
  loadingLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: 'rgba(0,27,135,.5)',
  },
  setupCard: {
    backgroundColor: colors.navy,
    borderRadius: radii.card,
    padding: 32,
    width: 320,
    gap: spacing.md,
    borderWidth: 2,
    borderColor: colors.cyan,
  },
  setupTitle: {
    fontFamily: fontFamily.black,
    fontSize: 22,
    color: colors.cyan,
  },
  setupSub: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,.45)',
  },
  nameLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: 'rgba(255,255,255,.6)',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,.12)',
    borderWidth: 2,
    borderColor: 'rgba(48,231,237,.4)',
    borderRadius: radii.md,
    padding: spacing.md,
    color: colors.offWhite,
    fontFamily: fontFamily.bold,
    fontSize: 15,
    textAlign: 'right',
  },
  setupButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  startBtn: {
    flex: 2,
    backgroundColor: colors.cyan,
    borderRadius: radii.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.3,
  },
  startBtnLabel: {
    fontFamily: fontFamily.black,
    fontSize: 16,
    color: colors.navy,
  },
  setupBackBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.15)',
    borderRadius: radii.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  setupBackLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: 'rgba(255,255,255,.45)',
  },
  resultScreen: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  streakCard: {
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.cyan,
    minWidth: 160,
  },
  streakValue: {
    fontFamily: fontFamily.black,
    fontSize: 52,
    color: colors.cyan,
  },
  streakLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,.5)',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: 4,
  },
  statCell: {
    alignItems: 'center',
  },
  statValue: {
    fontFamily: fontFamily.black,
    fontSize: 18,
    color: colors.gold,
  },
  statLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: 'rgba(255,255,255,.4)',
  },
  resultBody: {
    flex: 1,
    gap: spacing.md,
    maxWidth: 380,
  },
  resultTitle: {
    fontFamily: fontFamily.black,
    fontSize: 20,
    color: colors.pink,
  },
  answerCard: {
    backgroundColor: 'rgba(56,226,125,.12)',
    borderWidth: 1.5,
    borderColor: colors.green,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 2,
  },
  answerKicker: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: 'rgba(0,27,135,.5)',
  },
  answerText: {
    fontFamily: fontFamily.black,
    fontSize: 16,
    color: '#1a6b3c',
  },
  playScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.navy,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255,255,255,.07)',
  },
  headerSide: {
    alignItems: 'flex-start',
  },
  headerSideEnd: {
    alignItems: 'flex-end',
  },
  headerCenter: {
    alignItems: 'center',
    gap: 4,
  },
  headerBig: {
    fontFamily: fontFamily.black,
    fontSize: 30,
    color: colors.cyan,
  },
  bestValue: {
    color: colors.gold,
  },
  headerSmall: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: 'rgba(255,255,255,.45)',
  },
  headerName: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,.6)',
    marginTop: 2,
  },
  tierBadge: {
    paddingVertical: 2,
    paddingHorizontal: 10,
    borderRadius: radii.sm,
  },
  tierLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
  },
  questionArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  questionText: {
    fontFamily: fontFamily.black,
    fontSize: 22,
    lineHeight: 32,
    color: colors.navy,
    textAlign: 'center',
  },
  choicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.lg,
    paddingTop: 0,
  },
  choiceBtn: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: radii.md,
    borderWidth: 2,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  choiceText: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
});
