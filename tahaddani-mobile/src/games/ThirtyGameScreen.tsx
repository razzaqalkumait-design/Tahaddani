import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { BackBtn } from '../components/BackBtn';
import { colors, fontFamily, radii, spacing } from '../theme/tokens';
import { strings } from '../i18n';
import {
  calcThirtyPoints,
  otherPlayer,
  pickRandomThirtyCategory,
  THIRTY_CATS_UNIQUE,
} from '../games/thirty';
import { fetchThirtyQuestion } from '../api';
import type { ThirtyQuestion } from '../api';

export type ThirtyPhase = 'setup' | 'catpick' | 'bidding' | 'playing' | 'result' | 'endGame' | 'suddenDeath';

const MAX_ROUNDS = 10;
const THIRTY_TIMER_SECS = 30;
const MAX_SD_ROUNDS = 3;

/**
 * The local 2-player Thirty game, ported from the web build's
 * ThirtySetupStub: category pick, bid auction, timed answering with the judge
 * counting correct answers, 10 rounds, and sudden death on a tie.
 */
export function ThirtyGameScreen({
  onEnd,
  onBack,
}: {
  onEnd: (scores: [number, number], names: [string, string]) => void;
  onBack: () => void;
}) {
  const [phase, setPhase] = useState<ThirtyPhase>('setup');
  const [p0, setP0] = useState('');
  const [p1, setP1] = useState('');
  const [cat, setCat] = useState('');
  const [loadingQ, setLoadingQ] = useState(false);
  const [question, setQuestion] = useState<ThirtyQuestion | null>(null);
  const [bid, setBid] = useState(1);
  const [turn, setTurn] = useState<0 | 1>(0);
  const [bidder, setBidder] = useState<0 | 1>(0);
  const [timeLeft, setTimeLeft] = useState(THIRTY_TIMER_SECS);
  const [answersRevealed, setAnswersRevealed] = useState(false);
  const [answerCount, setAnswerCount] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [round, setRound] = useState(1);
  const [selCat, setSelCat] = useState<string | null>(null);

  // Sudden death
  const [sdPhase, setSdPhase] = useState<'none' | 'question' | 'reveal'>('none');
  const [sdQ, setSdQ] = useState<ThirtyQuestion | null>(null);
  const [sdCount, setSdCount] = useState(0);
  const [sdWinner, setSdWinner] = useState<0 | 1 | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const players: [string, string] = [p0 || strings.game.player1, p1 || strings.game.player2];

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => {
    if (!timerRunning) return;
    stopTimer();
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          stopTimer();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return stopTimer;
  }, [timerRunning, stopTimer]);

  // Timer expiry: the judge's count decides the round winner.
  useEffect(() => {
    if (timeLeft !== 0 || !timerRunning || !question) return;
    setTimerRunning(false);
    setScores((s) => {
      const next: [number, number] = [s[0], s[1]];
      if (answerCount >= bid) next[bidder] += calcThirtyPoints(bid);
      else next[otherPlayer(bidder)] += 1;
      return next;
    });
    setPhase('result');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  const won = answerCount >= bid;

  const loadQuestion = useCallback(async (category: string) => {
    setLoadingQ(true);
    const q = await fetchThirtyQuestion(category).catch(() => null);
    setLoadingQ(false);
    return q;
  }, []);

  const pickCat = async (c: string) => {
    const q = await loadQuestion(c);
    if (!q) return;
    setCat(c);
    setQuestion(q);
    setBid(1);
    setTurn(0);
    setPhase('bidding');
  };

  const raiseBid = () => {
    setBid((b) => b + 1);
    setTurn((t) => otherPlayer(t));
  };

  const passBid = () => {
    setBidder(otherPlayer(turn));
    setAnswersRevealed(false);
    setAnswerCount(0);
    setTimeLeft(THIRTY_TIMER_SECS);
    setPhase('playing');
    setTimerRunning(true);
  };

  const endRound = () => {
    stopTimer();
    setTimerRunning(false);
    setScores((s) => {
      const next: [number, number] = [s[0], s[1]];
      if (won) next[bidder] += calcThirtyPoints(bid);
      else next[otherPlayer(bidder)] += 1;
      return next;
    });
    setPhase('result');
  };

  const nextQuestion = async () => {
    const nextRound = round + 1;
    if (nextRound > MAX_ROUNDS) {
      setPhase('endGame');
      return;
    }
    const q = await loadQuestion(cat);
    if (!q) return;
    setQuestion(q);
    setBid(1);
    setTurn(0);
    setAnswersRevealed(false);
    setAnswerCount(0);
    setTimeLeft(THIRTY_TIMER_SECS);
    setTimerRunning(false);
    setRound(nextRound);
    setPhase('bidding');
  };

  // ── Sudden death ────────────────────────────────────
  const startThirtySd = async () => {
    setSdPhase('none');
    const q = await loadQuestion(cat);
    if (!q) {
      // No questions left — resolve as an exhausted tie.
      setSdQ(null);
      setSdPhase('none');
      setSdCount(MAX_SD_ROUNDS);
      return;
    }
    setSdQ(q);
    setSdWinner(null);
    setSdPhase('question');
  };

  const sdThirtyCorrect = (winner: 0 | 1, correct: number, total: number) => {
    if (correct >= total) {
      setSdPhase('none');
      setScores((s) => {
        const next: [number, number] = [s[0], s[1]];
        next[winner] += 100;
        return next;
      });
      setPhase('endGame');
    } else {
      const next = sdCount + 1;
      setSdCount(next);
      if (next >= MAX_SD_ROUNDS) {
        setSdPhase('none');
        setPhase('endGame');
      } else {
        void startThirtySd();
      }
    }
  };

  // First visit to endGame with a tie → auto-start sudden death.
  useEffect(() => {
    if (phase !== 'endGame' || sdCount !== 0 || sdPhase !== 'none') return;
    if (scores[0] !== scores[1]) return;
    const timer = setTimeout(() => void startThirtySd(), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, sdCount]);

  // A resolved endGame (clear winner, or tie after SD rounds) hands the
  // result to the router through onEnd.
  const finish = useCallback(() => {
    onEnd([scores[0], scores[1]], players);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scores, p0, p1]);

  useEffect(() => {
    if (phase !== 'endGame' || sdPhase !== 'none') return;
    const winner = scores[0] > scores[1] ? 0 : scores[1] > scores[0] ? 1 : -1;
    if (winner !== -1 || sdCount >= MAX_SD_ROUNDS) {
      const timer = setTimeout(finish, 350);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [phase, sdPhase, sdCount, scores, finish]);

  // ── End-game / sudden death question views ──────────
  if (phase === 'endGame') {
    if (sdPhase !== 'none' && sdQ) {
      return (
        <View style={styles.sdScreen}>
          <Text style={styles.sdTitle}>
            ⚡ {strings.game.suddenDeath} — {sdCount + 1} / {MAX_SD_ROUNDS}
          </Text>
          <Text style={styles.sdSub}>{strings.thirty.allRequired}</Text>

          <View style={styles.sdQuestionCard}>
            <Text style={styles.sdQuestionText}>{sdQ.question}</Text>
            <Text style={styles.sdCountLabel}>
              {sdQ.answers.length} {strings.thirty.answer}
            </Text>
          </View>

          {sdPhase === 'question' && (
            <View style={styles.sdButtonRow}>
              {([0, 1] as const).map((pi) => (
                <Pressable
                  key={pi}
                  style={styles.sdAnswerBtn}
                  onPress={() => {
                    setSdWinner(pi);
                    setSdPhase('reveal');
                  }}
                >
                  <Text style={styles.sdAnswerBtnLabel}>▶ {players[pi]}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {sdPhase === 'reveal' && sdWinner !== null && (
            <View style={styles.sdRevealBox}>
              <Text style={styles.sdJudgeLabel}>
                {players[sdWinner]} {strings.game.answer} — {strings.game.correct}
              </Text>
              <View style={styles.sdAnswerWrap}>
                {sdQ.answers.map((a, i) => (
                  <View key={i} style={styles.sdAnswerChip}>
                    <Text style={styles.sdAnswerText}>{a}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.sdButtonRow}>
                <Pressable
                  style={styles.sdCorrectBtn}
                  onPress={() => sdThirtyCorrect(sdWinner, sdQ.answers.length, sdQ.answers.length)}
                >
                  <Text style={styles.sdCorrectBtnLabel}>✓ {strings.thirty.gotAllWon}</Text>
                </Pressable>
                <Pressable
                  style={styles.sdWrongBtn}
                  onPress={() => sdThirtyCorrect(sdWinner, 0, sdQ.answers.length)}
                >
                  <Text style={styles.sdWrongLabel}>{strings.thirty.missing} ✕</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      );
    }
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.spinner} />
        <Text style={styles.loadingLabel}>{strings.game.loadingQuestions}</Text>
      </View>
    );
  }

  // ── Setup ───────────────────────────────────────────
  if (phase === 'setup') {
    const canStart = p0.trim().length > 0 && p1.trim().length > 0;
    return (
      <View style={styles.centeredScreen}>
        <BackBtn onPress={onBack} />
        <View style={styles.setupCard}>
          <Text style={styles.setupTitle}>⏱ {strings.thirty.title}</Text>
          <Text style={styles.setupSub}>{strings.thirty.setupSubtitle}</Text>
          <NameField value={p0} onChangeText={setP0} placeholder={strings.thirty.playerOne} />
          <NameField value={p1} onChangeText={setP1} placeholder={strings.thirty.playerTwo} />
          <Pressable
            style={[styles.primaryBtn, !canStart && styles.btnDisabled]}
            disabled={!canStart}
            onPress={() => setPhase('catpick')}
          >
            <Text style={styles.primaryBtnLabel}>{strings.game.selectCategory} →</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Category pick ───────────────────────────────────
  if (phase === 'catpick') {
    return (
      <View style={styles.centeredScreen}>
        <View style={styles.headerRow}>
          <BackBtn onPress={() => setPhase('setup')} />
          <Text style={styles.headerTitle}>{strings.game.selectCategory}</Text>
        </View>
        <ScrollView contentContainerStyle={styles.catGrid}>
          {THIRTY_CATS_UNIQUE.map((c) => {
            const sel = selCat === c;
            return (
              <Pressable
                key={c}
                style={[styles.catChip, sel && styles.catChipSelected]}
                onPress={() => setSelCat((s) => (s === c ? null : c))}
              >
                <Text style={[styles.catChipLabel, sel && styles.catChipLabelSelected]}>{c}</Text>
              </Pressable>
            );
          })}
          <Pressable
            style={[styles.catChip, selCat === '🎲' && styles.catChipSelected]}
            onPress={() => setSelCat((s) => (s === '🎲' ? null : '🎲'))}
          >
            <Text style={[styles.catChipLabel, selCat === '🎲' && styles.catChipLabelSelected]}>
              🎲 {strings.game.random}
            </Text>
          </Pressable>
        </ScrollView>
        {selCat ? (
          <View style={styles.dock}>
            <Pressable
              style={styles.dockBtn}
              onPress={() => {
                const chosen = selCat === '🎲' ? pickRandomThirtyCategory() : selCat;
                void pickCat(chosen);
              }}
            >
              <Text style={styles.dockBtnLabel}>
                {strings.game.playNow} <Text style={styles.dockIcon}>▶</Text>
              </Text>
            </Pressable>
          </View>
        ) : null}
        {loadingQ ? <LoadingInline /> : null}
      </View>
    );
  }

  // ── Bidding ─────────────────────────────────────────
  if (phase === 'bidding' && question) {
    return (
      <View style={styles.thirtyScreen}>
        <View style={styles.thirtyLeft}>
          <Text style={styles.auctionTitle}>{strings.thirty.auction}</Text>
          <View style={styles.thirtyQuestionCard}>
            <Text style={styles.thirtyQuestionText}>{question.question}</Text>
            {question.note ? <Text style={styles.thirtyNote}>ملاحظة: {question.note}</Text> : null}
          </View>
          <Text style={styles.turnText}>
            {strings.thirty.turnLabel}: <Text style={styles.turnName}>{players[turn]}</Text>
          </Text>
        </View>

        <View style={styles.thirtyRight}>
          <Scoreboard scores={scores} players={players} />
          <Text style={styles.bidLabel}>{strings.thirty.answerCount}</Text>
          <Text style={styles.bidValue}>{bid}</Text>
          <View style={styles.bidButtons}>
            <Pressable style={styles.raiseBtn} onPress={raiseBid}>
              <Text style={styles.raiseBtnLabel}>{strings.thirty.raise}</Text>
            </Pressable>
            <Pressable
              style={[styles.passBtn, bid <= 1 && styles.btnDisabled]}
              disabled={bid <= 1}
              onPress={passBid}
            >
              <Text style={[styles.passBtnLabel, bid <= 1 && styles.passBtnLabelDisabled]}>
                {strings.thirty.pass}
              </Text>
            </Pressable>
          </View>
          {bid === 1 && <Text style={styles.mustBid}>{strings.thirty.mustBidFirst}</Text>}
        </View>
      </View>
    );
  }

  // ── Playing ─────────────────────────────────────────
  if (phase === 'playing' && question) {
    return (
      <View style={styles.thirtyScreen}>
        <View style={styles.thirtyLeft}>
          <Text style={styles.bidderName}>{players[bidder]}</Text>
          <Text style={styles.bidderSub}>
            {strings.thirty.mustAnswer} {bid} {strings.thirty.answer}
          </Text>
          <View style={styles.thirtyQuestionCard}>
            <Text style={styles.thirtyQuestionText}>{question.question}</Text>
          </View>

          <View style={styles.answersArea}>
            {!answersRevealed ? (
              <Text style={styles.hiddenAnswers}>
                {question.answers.length} {strings.thirty.hiddenAnswers}
              </Text>
            ) : (
              <View style={styles.answerWrap}>
                {question.answers.map((a, i) => (
                  <View key={i} style={styles.answerChip}>
                    <Text style={styles.answerText}>{a}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.thirtyRight}>
          <Scoreboard scores={scores} players={players} />
          <View style={[styles.timerBox, timeLeft <= 10 && styles.timerBoxUrgent]}>
            <Text style={[styles.timerText, timeLeft <= 10 && styles.timerTextUrgent]}>{timeLeft}s</Text>
          </View>

          {!answersRevealed && (
            <Pressable style={styles.revealAnswersBtn} onPress={() => setAnswersRevealed(true)}>
              <Text style={styles.revealAnswersLabel}>👁 {strings.game.revealAnswer}</Text>
            </Pressable>
          )}

          <Text style={styles.counterLabel}>{strings.thirty.correctCount}</Text>
          <View style={styles.counterRow}>
            <Pressable style={styles.minusBtn} onPress={() => setAnswerCount((c) => Math.max(0, c - 1))}>
              <Text style={styles.minusLabel}>−</Text>
            </Pressable>
            <Text style={[styles.counterValue, answerCount >= bid && styles.counterValueWon]}>{answerCount}</Text>
            <Pressable
              style={styles.plusBtn}
              onPress={() => setAnswerCount((c) => Math.min(question.answers.length, c + 1))}
            >
              <Text style={styles.plusLabel}>+</Text>
            </Pressable>
          </View>
          <Text style={styles.requiredLabel}>
            {strings.thirty.requiredOf} {bid} {strings.thirty.required}
          </Text>

          <Pressable style={[styles.endRoundBtn, won && styles.endRoundBtnWon]} onPress={endRound}>
            <Text style={[styles.endRoundLabel, won && styles.endRoundLabelWon]}>
              {strings.thirty.endRound} {won ? '✓' : ''}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Result ──────────────────────────────────────────
  if (phase === 'result' && question) {
    return (
      <View style={styles.thirtyScreen}>
        <View style={styles.thirtyResultLeft}>
          <Scoreboard scores={scores} players={players} />
          <Text style={styles.resultEmoji}>{won ? '🏆' : '💥'}</Text>
          <Text style={[styles.resultTitle, won ? styles.resultWin : styles.resultLose]}>
            {won ? strings.thirty.great : strings.thirty.timeUp}
          </Text>
          <Text style={styles.resultDetail}>
            {players[bidder]} {strings.thirty.answeredOf} <Text style={styles.resultBold}>{answerCount}</Text>{' '}
            {strings.thirty.outOf} <Text style={styles.resultBold}>{bid}</Text>
          </Text>
          <Pressable style={styles.nextBtn} onPress={() => void nextQuestion()}>
            <Text style={styles.nextBtnLabel}>
              {round >= MAX_ROUNDS ? `${strings.end.winner} ←` : `${strings.game.next} ←`}
            </Text>
          </Pressable>
          <Pressable style={styles.ghostBtn} onPress={onBack}>
            <Text style={styles.ghostBtnLabel}>{strings.game.menu}</Text>
          </Pressable>
        </View>
        <View style={styles.thirtyResultRight}>
          <Text style={styles.allAnswersTitle}>
            {strings.thirty.allAnswers} ({question.answers.length})
          </Text>
          <ScrollView contentContainerStyle={styles.answerWrap}>
            {question.answers.map((a, i) => (
              <View key={i} style={styles.answerChip}>
                <Text style={styles.answerText}>{a}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  }

  // Loading while a question fetches.
  return (
    <View style={styles.loadingScreen}>
      <View style={styles.spinner} />
      <Text style={styles.loadingLabel}>{strings.game.loadingQuestions}</Text>
    </View>
  );
}

// ─── Small pieces ─────────────────────────────────────
function NameField({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="rgba(255,255,255,.35)"
      style={styles.input}
      maxLength={20}
    />
  );
}

function LoadingInline() {
  return (
    <View style={styles.loadingInline}>
      <Text style={styles.loadingInlineLabel}>{strings.game.loadingQuestions}</Text>
    </View>
  );
}

function Scoreboard({ scores, players }: { scores: [number, number]; players: [string, string] }) {
  return (
    <View style={styles.scoreboard}>
      {([0, 1] as const).map((i) => (
        <View key={i} style={styles.scoreCell}>
          <Text style={styles.scoreValue}>{scores[i]}</Text>
          <Text style={styles.scoreName} numberOfLines={1}>
            {players[i]}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  centeredScreen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
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
  loadingInline: {
    padding: spacing.md,
  },
  loadingInlineLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: 'rgba(0,27,135,.5)',
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    alignSelf: 'stretch',
  },
  headerTitle: {
    fontFamily: fontFamily.black,
    fontSize: 22,
    color: colors.navy,
  },
  setupCard: {
    backgroundColor: colors.navy,
    borderRadius: radii.card,
    padding: spacing.xl,
    width: 340,
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
  input: {
    backgroundColor: 'rgba(255,255,255,.12)',
    borderWidth: 2,
    borderColor: 'rgba(48,231,237,.4)',
    borderRadius: radii.md,
    padding: spacing.md,
    color: colors.offWhite,
    fontFamily: fontFamily.bold,
    fontSize: 17,
    textAlign: 'right',
  },
  primaryBtn: {
    backgroundColor: colors.cyan,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.35,
  },
  primaryBtnLabel: {
    fontFamily: fontFamily.black,
    fontSize: 17,
    color: colors.navy,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingBottom: 100,
  },
  catChip: {
    backgroundColor: colors.cyan,
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  catChipSelected: {
    backgroundColor: colors.navy,
    borderColor: colors.cyan,
  },
  catChipLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.navy,
  },
  catChipLabelSelected: {
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
  dockBtnLabel: {
    fontFamily: fontFamily.black,
    fontSize: 18,
    color: colors.navy,
  },
  dockIcon: {
    fontSize: 22,
  },
  thirtyScreen: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  thirtyLeft: {
    flex: 1.2,
    padding: spacing.md,
    gap: spacing.sm,
    justifyContent: 'center',
  },
  thirtyRight: {
    flex: 1,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  auctionTitle: {
    fontFamily: fontFamily.black,
    fontSize: 15,
    color: colors.navy,
  },
  thirtyQuestionCard: {
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 2,
    borderColor: colors.cyan,
  },
  thirtyQuestionText: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    lineHeight: 24,
    color: colors.offWhite,
    textAlign: 'center',
  },
  thirtyNote: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.cyan,
  },
  turnText: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: 'rgba(0,27,135,.55)',
    textAlign: 'center',
  },
  turnName: {
    color: colors.navy,
    fontSize: 18,
  },
  scoreboard: {
    flexDirection: 'row',
    backgroundColor: colors.cyan,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  scoreCell: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    minWidth: 60,
  },
  scoreValue: {
    fontFamily: fontFamily.black,
    fontSize: 22,
    color: colors.navy,
  },
  scoreName: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: 'rgba(0,27,135,.6)',
    maxWidth: 70,
  },
  bidLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,.5)',
  },
  bidValue: {
    fontFamily: fontFamily.black,
    fontSize: 56,
    color: colors.cyan,
  },
  bidButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
  raiseBtn: {
    flex: 1,
    backgroundColor: colors.cyan,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  raiseBtnLabel: {
    fontFamily: fontFamily.black,
    fontSize: 15,
    color: colors.navy,
  },
  passBtn: {
    flex: 1,
    backgroundColor: colors.pink,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  passBtnLabel: {
    fontFamily: fontFamily.black,
    fontSize: 15,
    color: colors.offWhite,
  },
  passBtnLabelDisabled: {
    color: 'rgba(255,255,255,.35)',
  },
  mustBid: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,.3)',
    textAlign: 'center',
  },
  bidderName: {
    fontFamily: fontFamily.black,
    fontSize: 14,
    color: colors.navy,
  },
  bidderSub: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: 'rgba(0,27,135,.5)',
  },
  answersArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hiddenAnswers: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: 'rgba(0,27,135,.35)',
    textAlign: 'center',
  },
  answerWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingVertical: spacing.sm,
  },
  answerChip: {
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  answerText: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: colors.offWhite,
  },
  timerBox: {
    backgroundColor: colors.cyan,
    borderRadius: radii.lg,
    paddingVertical: 8,
    paddingHorizontal: 22,
    minWidth: 90,
    alignItems: 'center',
  },
  timerBoxUrgent: {
    backgroundColor: colors.pink,
  },
  timerText: {
    fontFamily: fontFamily.black,
    fontSize: 40,
    color: colors.navy,
  },
  timerTextUrgent: {
    color: colors.offWhite,
  },
  revealAnswersBtn: {
    backgroundColor: colors.cyan,
    borderRadius: radii.md,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  revealAnswersLabel: {
    fontFamily: fontFamily.black,
    fontSize: 14,
    color: colors.navy,
  },
  counterLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,.45)',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  minusBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,.1)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  minusLabel: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.offWhite,
  },
  counterValue: {
    fontFamily: fontFamily.black,
    fontSize: 40,
    color: colors.offWhite,
    minWidth: 48,
    textAlign: 'center',
  },
  counterValueWon: {
    color: colors.green,
  },
  plusBtn: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusLabel: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.navy,
  },
  requiredLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,.35)',
  },
  endRoundBtn: {
    backgroundColor: 'rgba(255,255,255,.12)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,.2)',
    borderRadius: radii.md,
    paddingVertical: 9,
    paddingHorizontal: 20,
  },
  endRoundBtnWon: {
    backgroundColor: colors.green,
    borderWidth: 0,
  },
  endRoundLabel: {
    fontFamily: fontFamily.black,
    fontSize: 13,
    color: 'rgba(255,255,255,.7)',
  },
  endRoundLabelWon: {
    color: colors.navy,
  },
  thirtyResultLeft: {
    flex: 0.9,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  thirtyResultRight: {
    flex: 1.1,
    backgroundColor: colors.navy,
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  resultEmoji: {
    fontSize: 52,
  },
  resultTitle: {
    fontFamily: fontFamily.black,
    fontSize: 26,
    textAlign: 'center',
  },
  resultWin: {
    color: colors.green,
  },
  resultLose: {
    color: colors.pink,
  },
  resultDetail: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.navy,
    textAlign: 'center',
  },
  resultBold: {
    fontFamily: fontFamily.black,
    fontSize: 18,
    color: colors.navy,
  },
  nextBtn: {
    backgroundColor: colors.cyan,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignSelf: 'stretch',
    alignItems: 'center',
    shadowColor: colors.navy,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  nextBtnLabel: {
    fontFamily: fontFamily.black,
    fontSize: 14,
    color: colors.navy,
  },
  ghostBtn: {
    borderWidth: 1,
    borderColor: 'rgba(0,27,135,.2)',
    borderRadius: radii.md,
    paddingVertical: 10,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  ghostBtnLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: 'rgba(0,27,135,.55)',
  },
  allAnswersTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.cyan,
  },
  // Sudden death (thirty)
  sdScreen: {
    flex: 1,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  sdTitle: {
    fontFamily: fontFamily.black,
    fontSize: 13,
    color: colors.pink,
    letterSpacing: 1.5,
  },
  sdSub: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,.4)',
  },
  sdQuestionCard: {
    backgroundColor: 'rgba(255,255,255,.08)',
    borderWidth: 2,
    borderColor: 'rgba(48,231,237,.25)',
    borderRadius: 14,
    padding: spacing.lg,
    alignSelf: 'stretch',
    maxWidth: 540,
    alignItems: 'center',
  },
  sdQuestionText: {
    fontFamily: fontFamily.black,
    fontSize: 18,
    color: colors.offWhite,
    textAlign: 'center',
  },
  sdCountLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,.4)',
    marginTop: 4,
  },
  sdButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignSelf: 'stretch',
    maxWidth: 540,
    flexWrap: 'wrap',
  },
  sdAnswerBtn: {
    flex: 1,
    minWidth: 130,
    backgroundColor: colors.cyan,
    borderRadius: radii.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  sdAnswerBtnLabel: {
    fontFamily: fontFamily.black,
    fontSize: 14,
    color: colors.navy,
  },
  sdRevealBox: {
    alignSelf: 'stretch',
    maxWidth: 540,
    alignItems: 'center',
    gap: spacing.sm,
  },
  sdJudgeLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,.5)',
    textAlign: 'center',
  },
  sdAnswerWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  sdAnswerChip: {
    backgroundColor: 'rgba(255,255,255,.07)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,.2)',
    borderRadius: radii.md,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  sdAnswerText: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.offWhite,
  },
  sdCorrectBtn: {
    flex: 2,
    backgroundColor: colors.green,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sdCorrectBtnLabel: {
    fontFamily: fontFamily.black,
    fontSize: 14,
    color: colors.navy,
    textAlign: 'center',
  },
  sdWrongBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,61,104,.2)',
    borderWidth: 1.5,
    borderColor: colors.pink,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sdWrongLabel: {
    fontFamily: fontFamily.black,
    fontSize: 13,
    color: colors.pink,
  },
});
