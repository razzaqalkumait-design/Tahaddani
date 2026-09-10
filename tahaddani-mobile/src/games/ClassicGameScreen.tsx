import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BackBtn } from '../components/BackBtn';
import { QuestionPanel } from '../components/QuestionPanel';
import { ScoreBar, TurnLabel } from '../components/ScoreBar';
import { TimerRing } from '../components/TimerRing';
import { colors, fontFamily, radii, spacing } from '../theme/tokens';
import { strings } from '../i18n';
import {
  SKIP_TIMER_SECS,
  TIERS,
  TIMER_SECS,
  WICKED_HIGH_TIERS,
  loadQuestionsForGame,
  pickQuestion,
  pickSuddenDeathQuestion,
  shuffle,
} from '../games/board';
import type { GameMode } from '../types';
import type { Question } from '../api';

export type WickedEvent = 'double' | 'deduct' | 'transfer' | 'noPoints' | 'keepTurn' | 'gotYouuu';

const WICKED_CORRECT: readonly WickedEvent[] = ['double', 'deduct', 'transfer', 'noPoints', 'keepTurn'];

const WICKED_META: Record<WickedEvent, { emoji: string; label: string; color: string }> = {
  double: { emoji: '🔥', label: strings.game.double, color: '#FF9500' },
  deduct: { emoji: '⚠️', label: strings.game.deduct, color: colors.pink },
  transfer: { emoji: '😈', label: strings.game.transfer, color: colors.purple },
  noPoints: { emoji: '🚫', label: strings.game.noPoints, color: '#6B7280' },
  keepTurn: { emoji: '🔄', label: strings.game.keepTurn, color: colors.cyan },
  gotYouuu: { emoji: '🎉', label: strings.game.gotYouuu, color: colors.green },
};

interface GameActionUsed {
  block: Record<string, boolean>;
  steal: Record<string, boolean>;
  double: Record<string, boolean>;
}

interface GameActionState {
  block: boolean;
  steal: boolean;
  double: boolean;
  doubleTeam: string;
}

/**
 * The classic/wicked board game, ported from the web build's GameScreen:
 * category board with five point tiers, turn rotation, skip/steal/block/
 * double actions, wicked events on high-value questions, and sudden death on
 * ties. Questions come from the `get-questions` edge function.
 */
export function ClassicGameScreen({
  mode,
  players,
  groups,
  onEnd,
  onBack,
}: {
  mode: GameMode;
  players: string[];
  groups: string[];
  onEnd: (scores: Record<string, number>, names: Record<string, string>) => void;
  onBack: () => void;
}) {
  const isFFA = mode === 'ffa' || mode === 'wickedFfa';
  const isWicked = mode.includes('wicked');

  const [questionsReady, setQuestionsReady] = useState(false);
  useEffect(() => {
    let active = true;
    loadQuestionsForGame(groups)
      .catch(() => {})
      .then(() => {
        if (active) setQuestionsReady(true);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [names] = useState<Record<string, string>>(() => {
    const n: Record<string, string> = {};
    if (isFFA) players.forEach((p, i) => (n[i] = p));
    else {
      n[1] = players[0] || strings.game.teamOneShort;
      n[2] = players[1] || strings.game.teamTwoShort;
    }
    return n;
  });
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const s: Record<string, number> = {};
    if (isFFA) players.forEach((_, i) => (s[i] = 0));
    else {
      s[1] = 0;
      s[2] = 0;
    }
    return s;
  });
  const [currentTeam, setCurrentTeam] = useState<string>(isFFA ? '0' : '1');
  const [usedCells, setUsedCells] = useState<Set<string>>(new Set());
  const [usedQTexts, setUsedQTexts] = useState<Set<string>>(new Set());
  const [cellWinners, setCellWinners] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState<Question | null>(null);
  const [ansTeam, setAnsTeam] = useState<string>(isFFA ? '0' : '1');
  const [showAnswer, setShowAnswer] = useState(true);
  const [skipped, setSkipped] = useState(false);
  const [showReveal, setShowReveal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECS);
  const [shuffledGroups] = useState<string[]>(() => shuffle(groups));
  const [doubleArmed, setDoubleArmed] = useState(false);

  // Sudden death
  const [sdPhase, setSdPhase] = useState<'none' | 'question' | 'reveal'>('none');
  const [sdQ, setSdQ] = useState<Question | null>(null);
  const [sdCount, setSdCount] = useState(0);
  const [sdAnsTeam, setSdAnsTeam] = useState<string | null>(null);

  const [gaUsed, setGaUsed] = useState<GameActionUsed>({ block: {}, steal: {}, double: {} });
  const [gaState, setGaState] = useState<GameActionState>({ block: false, steal: false, double: false, doubleTeam: '' });

  // Wicked event decks: exactly 2 triggers among high-value question slots per team.
  const [wickedDecks] = useState<Record<string, boolean[]>>(() => {
    if (!isWicked) return {};
    const hvCount = shuffledGroups.length * WICKED_HIGH_TIERS.length;
    const deck = (n: number) => {
      const arr = Array(n).fill(false);
      arr[0] = true;
      arr[1] = true;
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j]!, arr[i]!];
      }
      return arr;
    };
    const keys = isFFA ? players.map((_, i) => String(i)) : ['1', '2'];
    return Object.fromEntries(keys.map((k) => [k, deck(Math.max(hvCount, 3))]));
  });
  const [wickedDeckIdx, setWickedDeckIdx] = useState<Record<string, number>>({});
  const [wickedUsedEvents, setWickedUsedEvents] = useState<Record<string, WickedEvent[]>>({});
  const [lastEvent, setLastEvent] = useState<WickedEvent | null>(null);
  const [activeWickedEvent, setActiveWickedEvent] = useState<{ event: WickedEvent; team: string } | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);
  const startTimer = useCallback(
    (secs: number) => {
      stopTimer();
      setTimeLeft(secs);
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            stopTimer();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    },
    [stopTimer],
  );
  useEffect(() => stopTimer, [stopTimer]);

  const otherTeam = useCallback(
    (team: string) => (isFFA ? String((Number(team) + 1) % players.length) : team === '1' ? '2' : '1'),
    [isFFA, players.length],
  );

  const finishGame = useCallback(
    (finalScores: Record<string, number>) => {
      stopTimer();
      onEnd(finalScores, names);
    },
    [names, onEnd, stopTimer],
  );

  // Timer expiry
  useEffect(() => {
    if (timeLeft !== 0) return;
    if (sdPhase === 'question') {
      setSdPhase('reveal');
      return;
    }
    if (!currentQ) return;
    if (isFFA || skipped || gaState.block) setShowReveal(true);
    else skip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  const selectQuestion = (group: string, pts: number) => {
    const key = `${group}|${pts}`;
    if (usedCells.has(key)) return;
    const q = pickQuestion(group, pts);
    if (!q) return;
    setUsedQTexts((s) => new Set([...s, q.question]));
    setCurrentQ(q);
    setAnsTeam(currentTeam);
    setShowAnswer(false);
    setSkipped(false);
    setShowReveal(false);
    setGaState({
      block: false,
      steal: false,
      double: doubleArmed,
      doubleTeam: doubleArmed ? currentTeam : '',
    });
    if (doubleArmed) {
      setGaUsed((u) => ({ ...u, double: { ...u.double, [currentTeam]: true } }));
      setDoubleArmed(false);
    }
    startTimer(TIMER_SECS);
  };

  const triggerSuddenDeath = (currentScores: Record<string, number>, currentUsedTexts: Set<string>) => {
    const q = pickSuddenDeathQuestion(currentUsedTexts);
    if (!q) {
      finishGame(currentScores);
      return;
    }
    setSdQ(q);
    setSdAnsTeam(null);
    setSdPhase('question');
    setUsedQTexts((s) => new Set([...s, q.question]));
    startTimer(TIMER_SECS);
  };

  const closeQuestion = (winnerTeam?: string) => {
    const q = currentQ;
    if (!q) return;
    const key = `${q.group}|${q.points}`;
    const newUsedCells = new Set([...usedCells, key]);
    const newUsedTexts = new Set([...usedQTexts, q.question]);
    setUsedCells(newUsedCells);
    setUsedQTexts(newUsedTexts);
    setCellWinners((w) => ({ ...w, [key]: winnerTeam ?? '' }));
    setCurrentQ(null);
    setShowAnswer(false);
    stopTimer();
    setSkipped(false);
    setShowReveal(false);
    setGaState({ block: false, steal: false, double: false, doubleTeam: '' });
    setCurrentTeam((t) => (isFFA ? String((Number(t) + 1) % players.length) : t === '1' ? '2' : '1'));
    const total = shuffledGroups.length * TIERS.length;
    if (newUsedCells.size >= total) {
      const newScores = winnerTeam ? { ...scores, [winnerTeam]: scores[winnerTeam] ?? 0 } : scores;
      const keys = isFFA ? players.map((_, i) => String(i)) : ['1', '2'];
      const topScore = Math.max(...keys.map((k) => newScores[k] ?? 0));
      const tied = keys.filter((k) => (newScores[k] ?? 0) === topScore);
      if (!isFFA && tied.length > 1) {
        setTimeout(() => {
          setSdCount(0);
          triggerSuddenDeath(newScores, newUsedTexts);
        }, 400);
      } else {
        setTimeout(() => finishGame(newScores), 400);
      }
    }
  };

  // ── Wicked events ───────────────────────────────────
  const rollWickedEvent = (team: string, pool: readonly WickedEvent[]): WickedEvent | null => {
    if (!isWicked || !currentQ) return null;
    if (!(WICKED_HIGH_TIERS as readonly number[]).includes(currentQ.points)) return null;
    const deck = wickedDecks[team];
    const idx = wickedDeckIdx[team] || 0;
    const shouldFire = deck ? (deck[idx] ?? false) : false;
    setWickedDeckIdx((d) => ({ ...d, [team]: idx + 1 }));
    if (!shouldFire) return null;
    const alreadyUsed = wickedUsedEvents[team] || [];
    const candidates = pool.filter((e) => e !== lastEvent && !alreadyUsed.includes(e));
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
  };

  const applyWickedCorrect = (team: string, basePts: number, event: WickedEvent) => {
    const other = otherTeam(team);
    setWickedUsedEvents((u) => ({ ...u, [team]: [...(u[team] || []), event] }));
    setLastEvent(event);
    setActiveWickedEvent({ event, team });
    setTimeout(() => {
      setActiveWickedEvent(null);
      if (event === 'double') {
        setScores((s) => ({ ...s, [team]: (s[team] ?? 0) + basePts * 2 }));
        closeQuestion(team);
      } else if (event === 'deduct') {
        setScores((s) => ({ ...s, [team]: (s[team] ?? 0) - basePts }));
        closeQuestion(team);
      } else if (event === 'transfer') {
        setScores((s) => ({ ...s, [other]: (s[other] ?? 0) + basePts }));
        closeQuestion(other);
      } else if (event === 'noPoints') {
        closeQuestion(team);
      } else if (event === 'keepTurn') {
        const q = currentQ;
        if (!q) return;
        const key = `${q.group}|${q.points}`;
        setUsedCells((s) => new Set([...s, key]));
        setCellWinners((w) => ({ ...w, [key]: team }));
        setCurrentQ(null);
        setShowAnswer(false);
        stopTimer();
        setSkipped(false);
        setShowReveal(false);
        setGaState({ block: false, steal: false, double: false, doubleTeam: '' });
        const total = shuffledGroups.length * TIERS.length;
        if (usedCells.size + 1 >= total) setTimeout(() => finishGame(scores), 400);
      }
    }, 2200);
  };

  const correctFor = (team: string) => {
    if (!currentQ) return;
    const basePts = gaState.double && gaState.doubleTeam === team ? currentQ.points * 2 : currentQ.points;
    const event = rollWickedEvent(team, WICKED_CORRECT);
    if (event) {
      applyWickedCorrect(team, basePts, event);
      return;
    }
    setScores((s) => ({ ...s, [team]: (s[team] ?? 0) + basePts }));
    closeQuestion(team);
  };

  const noOne = () => {
    const q = currentQ;
    if (!q) return;
    const event = rollWickedEvent(ansTeam, ['gotYouuu']);
    if (event === 'gotYouuu') {
      const basePts = q.points;
      setWickedUsedEvents((u) => ({ ...u, [ansTeam]: [...(u[ansTeam] || []), 'gotYouuu'] }));
      setLastEvent('gotYouuu');
      setActiveWickedEvent({ event: 'gotYouuu', team: ansTeam });
      setTimeout(() => {
        setActiveWickedEvent(null);
        setScores((s) => ({ ...s, [ansTeam]: (s[ansTeam] ?? 0) + basePts }));
        closeQuestion(ansTeam);
      }, 2200);
      return;
    }
    closeQuestion('');
  };

  const skip = () => {
    if (!currentQ || skipped || gaState.block) return;
    setAnsTeam(otherTeam(currentTeam));
    setSkipped(true);
    setShowAnswer(false);
    startTimer(SKIP_TIMER_SECS);
  };

  const steal = () => {
    if (!currentQ || skipped || gaState.double) return;
    const thief = otherTeam(currentTeam);
    setGaUsed((u) => ({ ...u, steal: { ...u.steal, [thief]: true } }));
    setGaState((s) => ({ ...s, steal: true }));
    setAnsTeam(thief);
    setSkipped(true);
    startTimer(SKIP_TIMER_SECS);
  };

  const changeQ = () => {
    if (!currentQ) return;
    const q = pickQuestion(currentQ.group, currentQ.points, currentQ.question);
    if (q) {
      setCurrentQ(q);
      setShowAnswer(false);
      startTimer(TIMER_SECS);
    }
  };

  const revealAnswer = () => {
    setShowAnswer(true);
    stopTimer();
  };

  // ── Sudden death handlers ───────────────────────────
  const sdCorrect = (team: string) => {
    stopTimer();
    const newScores = { ...scores, [team]: (scores[team] ?? 0) + (sdQ?.points || 500) };
    setScores(newScores);
    setSdPhase('none');
    setSdQ(null);
    finishGame(newScores);
  };

  const sdNoOne = () => {
    stopTimer();
    const next = sdCount + 1;
    setSdCount(next);
    if (next >= 3) {
      setSdPhase('none');
      setSdQ(null);
      finishGame(scores);
    } else {
      const q = pickSuddenDeathQuestion(usedQTexts);
      if (!q) {
        setSdPhase('none');
        setSdQ(null);
        finishGame(scores);
        return;
      }
      setUsedQTexts((s) => new Set([...s, q.question]));
      setSdQ(q);
      setSdAnsTeam(null);
      setSdPhase('question');
      startTimer(TIMER_SECS);
    }
  };

  // ── Loading ─────────────────────────────────────────
  if (!questionsReady) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.spinner} />
        <Text style={styles.loadingLabel}>{strings.game.loadingQuestions}</Text>
      </View>
    );
  }

  // ── Sudden death view ───────────────────────────────
  if (sdPhase !== 'none' && sdQ) {
    const sdTeamKeys = ['1', '2'];
    return (
      <View style={styles.sdScreen}>
        <View style={styles.sdHeader}>
          <Text style={styles.sdTitle}>
            ⚡ {strings.game.suddenDeath} — {sdCount + 1} / 3
          </Text>
          <Text style={styles.sdSub}>{strings.game.suddenDeathSub}</Text>
        </View>

        <TimerRing timeLeft={timeLeft} total={TIMER_SECS} />

        <View style={styles.sdQuestionCard}>
          <Text style={styles.sdQuestionText}>{sdQ.question}</Text>
        </View>

        {sdPhase === 'question' ? (
          <View style={styles.sdButtonRow}>
            {sdTeamKeys.map((k) => (
              <Pressable
                key={k}
                style={styles.sdAnswerBtn}
                onPress={() => {
                  stopTimer();
                  setSdAnsTeam(k);
                  setSdPhase('reveal');
                }}
              >
                <Text style={styles.sdAnswerBtnLabel}>✓ {names[k]}</Text>
              </Pressable>
            ))}
            <Pressable
              style={styles.sdNobodyBtn}
              onPress={() => {
                stopTimer();
                setSdPhase('reveal');
              }}
            >
              <Text style={styles.sdNobodyLabel}>{strings.game.nobody} ✕</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.sdRevealBox}>
            <View style={styles.sdCorrectCard}>
              <Text style={styles.sdCorrectKicker}>{strings.game.correctAnswer}</Text>
              <Text style={styles.sdCorrectText}>{sdQ.answer}</Text>
            </View>
            {sdAnsTeam ? (
              <View style={styles.sdButtonRow}>
                <Pressable style={styles.sdCorrectBtn} onPress={() => sdCorrect(sdAnsTeam)}>
                  <Text style={styles.sdCorrectBtnLabel}>
                    ✓ {strings.game.correct} — {strings.end.winner} {names[sdAnsTeam]}
                  </Text>
                </Pressable>
                <Pressable style={styles.sdWrongBtn} onPress={sdNoOne}>
                  <Text style={styles.sdWrongLabel}>{strings.game.wrong} ✕</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.sdNextBtn} onPress={sdNoOne}>
                <Text style={styles.sdNextLabel}>
                  {sdCount + 1 >= 3 ? strings.game.endAsTie : `${strings.game.next} ←`}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    );
  }

  // ── Main board view ─────────────────────────────────
  const totalCells = shuffledGroups.length * TIERS.length;

  return (
    <View style={styles.screen}>
      {activeWickedEvent ? (
        <WickedEventOverlay event={activeWickedEvent.event} teamName={names[activeWickedEvent.team] ?? ''} />
      ) : null}

      {isFFA ? (
        <FfaScoreBar
          players={players}
          names={names}
          scores={scores}
          currentTeam={currentTeam}
          ansTeam={ansTeam}
          answering={!!currentQ}
        />
      ) : (
        <ScoreBar
          entries={[
            {
              key: '1',
              name: names['1'] ?? '',
              points: scores['1'] ?? 0,
              side: 0,
              active: currentTeam === '1' && !currentQ,
              answering: !!currentQ && ansTeam === '1',
            },
            {
              key: '2',
              name: names['2'] ?? '',
              points: scores['2'] ?? 0,
              side: 1,
              active: currentTeam === '2' && !currentQ,
              answering: !!currentQ && ansTeam === '2',
            },
          ]}
          center={
            <>
              <TurnLabel name={names[currentTeam] ?? ''} />
              {!isWicked && !currentQ && (
                <Pressable
                  style={[styles.doubleBtn, doubleArmed && styles.doubleBtnArmed]}
                  disabled={!!gaUsed.double[currentTeam]}
                  onPress={() => setDoubleArmed((d) => !d)}
                >
                  <Text style={styles.doubleBtnLabel}>🔥</Text>
                </Pressable>
              )}
              {!currentQ && (
                <Text style={styles.cellCounter}>
                  {usedCells.size}/{totalCells}
                </Text>
              )}
            </>
          }
        />
      )}

      {!currentQ ? (
        <Board
          groups={shuffledGroups}
          usedCells={usedCells}
          cellWinners={cellWinners}
          names={names}
          onSelect={selectQuestion}
        />
      ) : showReveal ? (
        <View style={styles.revealBox}>
          <Text style={styles.revealKicker}>{strings.game.correctAnswer}</Text>
          <View style={styles.revealCard}>
            <Text style={styles.revealText}>{currentQ.answer}</Text>
          </View>
          <View style={styles.revealActions}>
            {isFFA ? (
              <>
                <ActionButton kind="success" label={`✓ ${strings.game.correct}`} onPress={() => correctFor(ansTeam)} />
                <ActionButton kind="danger" label={`${strings.game.wrong} ✕`} onPress={noOne} />
              </>
            ) : (
              <>
                {['1', '2'].map((k) => (
                  <ActionButton
                    key={k}
                    kind="success"
                    label={`✓ ${names[k]}`}
                    onPress={() => correctFor(k)}
                  />
                ))}
                <ActionButton kind="danger" label={`${strings.game.nobody} ✕`} onPress={noOne} />
              </>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.questionRow}>
          <View style={styles.questionMain}>
            <QuestionPanel
              group={currentQ.group}
              points={currentQ.points}
              question={currentQ.question}
              doubled={gaState.double}
              stoleBy={gaState.steal ? names[ansTeam] : undefined}
            />

            <View style={styles.actionRow}>
              <SmallButton
                label={`🔄 ${strings.game.changeQuestion}`}
                disabled={skipped || gaState.block || gaState.steal}
                onPress={changeQ}
              />
              {isFFA ? (
                <SmallButton
                  label={`${strings.game.finish} ←`}
                  onPress={() => {
                    stopTimer();
                    setShowReveal(true);
                  }}
                />
              ) : !skipped && !gaState.block && !gaState.steal ? (
                <SmallButton label={`${strings.game.finish} ←`} onPress={skip} />
              ) : (
                <SmallButton
                  label={`${strings.game.finish} ${names[ansTeam]} ←`}
                  onPress={() => {
                    stopTimer();
                    setShowReveal(true);
                  }}
                />
              )}
              {!isFFA && !skipped && (
                <>
                  <SmallButton
                    label={`🛑 ${strings.game.block}`}
                    disabled={!!gaUsed.block[currentTeam] || gaState.block || gaState.steal || gaState.double}
                    onPress={() => {
                      setGaUsed((u) => ({ ...u, block: { ...u.block, [currentTeam]: true } }));
                      setGaState((s) => ({ ...s, block: true }));
                    }}
                  />
                  <SmallButton
                    label={`🦊 ${strings.game.steal}`}
                    disabled={
                      !!gaUsed.steal[otherTeam(currentTeam)] || gaState.steal || gaState.block || gaState.double
                    }
                    onPress={steal}
                  />
                </>
              )}
            </View>
          </View>

          <View style={styles.timerColumn}>
            <TimerRing timeLeft={timeLeft} total={TIMER_SECS} />
          </View>
        </View>
      )}

      <View style={styles.bottomBar}>
        <BackBtn onPress={onBack} />
        <Pressable
          style={styles.revealTopBtn}
          onPress={revealAnswer}
          disabled={!currentQ || showAnswer || showReveal}
        >
          <Text style={styles.revealTopLabel}>👁 {strings.game.revealAnswer}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Board ────────────────────────────────────────────
function Board({
  groups,
  usedCells,
  cellWinners,
  names,
  onSelect,
}: {
  groups: string[];
  usedCells: Set<string>;
  cellWinners: Record<string, string>;
  names: Record<string, string>;
  onSelect: (group: string, pts: number) => void;
}) {
  return (
    <ScrollView style={styles.boardScroll} contentContainerStyle={styles.boardContent} bounces={false}>
      <View style={styles.categoryRow}>
        {groups.map((g) => (
          <View key={g} style={styles.categoryCell}>
            <Text style={styles.categoryLabel} numberOfLines={2}>
              {g}
            </Text>
          </View>
        ))}
      </View>

      {TIERS.map((pts) => (
        <View key={pts} style={styles.tierRow}>
          {groups.map((g) => {
            const key = `${g}|${pts}`;
            const used = usedCells.has(key);
            const winner = cellWinners[key];
            return (
              <Pressable
                key={key}
                style={[styles.boardCell, used && styles.boardCellUsed]}
                onPress={() => !used && onSelect(g, pts)}
                disabled={used}
              >
                <Text style={[styles.boardCellText, used && styles.boardCellTextUsed]}>
                  {used ? (winner ? names[winner] : '0') : pts}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

// ─── FFA score bar ────────────────────────────────────
function FfaScoreBar({
  players,
  names,
  scores,
  currentTeam,
  ansTeam,
  answering,
}: {
  players: string[];
  names: Record<string, string>;
  scores: Record<string, number>;
  currentTeam: string;
  ansTeam: string;
  answering: boolean;
}) {
  const half = Math.ceil(players.length / 2);
  const left = players.slice(0, half);
  const right = players.slice(half);

  const chip = (index: number) => {
    const key = String(index);
    const active = key === currentTeam;
    const isAnswering = answering && key === ansTeam;
    const lit = (active || isAnswering) && players.length === 2;
    return (
      <View key={key} style={styles.ffaChip}>
        <Text style={[styles.ffaName, lit && styles.ffaNameLit]} numberOfLines={1}>
          {names[key]}
        </Text>
        <Text style={[styles.ffaPoints, lit && styles.ffaPointsLit]}>{scores[key] ?? 0}</Text>
      </View>
    );
  };

  return (
    <View style={styles.ffaBar}>
      <View style={styles.ffaSide}>{left.map((_, i) => chip(i))}</View>
      <View style={styles.ffaCenter}>
        <TurnLabel name={names[currentTeam] ?? ''} />
      </View>
      <View style={styles.ffaSide}>{right.map((_, i) => chip(half + i))}</View>
    </View>
  );
}

// ─── Wicked event overlay ─────────────────────────────
function WickedEventOverlay({ event, teamName }: { event: WickedEvent; teamName: string }) {
  const meta = WICKED_META[event];
  const desc =
    event === 'double'
      ? `${teamName} ${strings.game.double}`
      : event === 'transfer'
        ? `${teamName} ${strings.game.transfer}`
        : event === 'gotYouuu'
          ? `${teamName} ${strings.game.gotYouuu}`
          : `${teamName} — ${meta.label}`;
  return (
    <View style={styles.wickedBackdrop}>
      <View style={styles.wickedCard}>
        <Text style={styles.wickedEmoji}>{meta.emoji}</Text>
        <Text style={[styles.wickedLabel, { color: meta.color }]}>{meta.label}</Text>
        <Text style={styles.wickedDesc}>{desc}</Text>
      </View>
    </View>
  );
}

// ─── Small building blocks ────────────────────────────
function ActionButton({ kind, label, onPress }: { kind: 'success' | 'danger'; label: string; onPress: () => void }) {
  return (
    <Pressable
      style={[styles.bigBtn, kind === 'success' ? styles.bigBtnSuccess : styles.bigBtnDanger]}
      onPress={onPress}
    >
      <Text style={styles.bigBtnLabel}>{label}</Text>
    </Pressable>
  );
}

function SmallButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable style={[styles.smallBtn, disabled && styles.smallBtnDisabled]} onPress={onPress} disabled={disabled}>
      <Text style={styles.smallBtnLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  spinner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: 'rgba(48,231,237,.2)',
    borderTopColor: colors.cyan,
  },
  loadingLabel: {
    fontFamily: fontFamily.regular,
    color: 'rgba(255,255,255,.5)',
    fontSize: 14,
  },
  // Sudden death
  sdScreen: {
    flex: 1,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  sdHeader: {
    alignItems: 'center',
    gap: 4,
  },
  sdTitle: {
    fontFamily: fontFamily.black,
    fontSize: 13,
    color: colors.pink,
    letterSpacing: 1.5,
  },
  sdSub: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,.4)',
  },
  sdQuestionCard: {
    backgroundColor: 'rgba(255,255,255,.06)',
    borderWidth: 2,
    borderColor: 'rgba(48,231,237,.25)',
    borderRadius: 14,
    padding: spacing.xl,
    alignSelf: 'stretch',
    maxWidth: 560,
    alignItems: 'center',
  },
  sdQuestionText: {
    fontFamily: fontFamily.black,
    fontSize: 20,
    lineHeight: 30,
    color: colors.offWhite,
    textAlign: 'center',
  },
  sdButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignSelf: 'stretch',
    maxWidth: 560,
    flexWrap: 'wrap',
  },
  sdAnswerBtn: {
    flex: 1,
    minWidth: 120,
    backgroundColor: colors.cyan,
    borderRadius: radii.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  sdAnswerBtnLabel: {
    fontFamily: fontFamily.black,
    fontSize: 15,
    color: colors.navy,
  },
  sdNobodyBtn: {
    flex: 1,
    minWidth: 120,
    backgroundColor: 'rgba(255,61,104,.2)',
    borderWidth: 1.5,
    borderColor: colors.pink,
    borderRadius: radii.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  sdNobodyLabel: {
    fontFamily: fontFamily.black,
    fontSize: 15,
    color: colors.pink,
  },
  sdRevealBox: {
    alignSelf: 'stretch',
    maxWidth: 560,
    alignItems: 'center',
    gap: spacing.md,
  },
  sdCorrectCard: {
    backgroundColor: 'rgba(56,226,125,.15)',
    borderWidth: 1.5,
    borderColor: colors.green,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  sdCorrectKicker: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,.4)',
  },
  sdCorrectText: {
    fontFamily: fontFamily.black,
    fontSize: 18,
    color: colors.green,
  },
  sdCorrectBtn: {
    flex: 2,
    backgroundColor: colors.green,
    borderRadius: radii.md,
    paddingVertical: 13,
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
    paddingVertical: 13,
    alignItems: 'center',
  },
  sdWrongLabel: {
    fontFamily: fontFamily.black,
    fontSize: 14,
    color: colors.pink,
  },
  sdNextBtn: {
    backgroundColor: 'rgba(255,61,104,.2)',
    borderWidth: 1.5,
    borderColor: colors.pink,
    borderRadius: radii.md,
    paddingVertical: 13,
    paddingHorizontal: 24,
  },
  sdNextLabel: {
    fontFamily: fontFamily.black,
    fontSize: 15,
    color: colors.pink,
  },
  // Board
  boardScroll: {
    flex: 1,
  },
  boardContent: {
    padding: spacing.sm,
    gap: 6,
    flexGrow: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 6,
  },
  categoryCell: {
    flex: 1,
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.cyan,
    textAlign: 'center',
  },
  tierRow: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
    minHeight: 44,
  },
  boardCell: {
    flex: 1,
    backgroundColor: colors.cyan,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0,27,135,.15)',
  },
  boardCellUsed: {
    backgroundColor: 'rgba(0,27,135,.08)',
    borderColor: 'transparent',
    opacity: 0.7,
  },
  boardCellText: {
    fontFamily: fontFamily.black,
    fontSize: 18,
    color: colors.navy,
  },
  boardCellTextUsed: {
    fontSize: 12,
    color: colors.green,
  },
  // Question / reveal
  questionRow: {
    flex: 1,
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
  },
  questionMain: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  timerColumn: {
    width: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  revealKicker: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.navy,
    letterSpacing: 2,
    opacity: 0.6,
  },
  revealCard: {
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    borderTopWidth: 4,
    borderTopColor: colors.cyan,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  revealText: {
    fontFamily: fontFamily.black,
    fontSize: 26,
    color: colors.cyan,
    textAlign: 'center',
  },
  revealActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  bigBtn: {
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: 26,
    alignItems: 'center',
  },
  bigBtnSuccess: {
    backgroundColor: colors.green,
  },
  bigBtnDanger: {
    backgroundColor: colors.pink,
  },
  bigBtnLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.navy,
  },
  smallBtn: {
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 0,
    elevation: 3,
  },
  smallBtnDisabled: {
    opacity: 0.35,
  },
  smallBtnLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.offWhite,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    paddingBottom: spacing.sm + 4,
  },
  revealTopBtn: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(0,27,135,.08)',
    borderRadius: radii.md,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  revealTopLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.navy,
  },
  // Score bar extras
  doubleBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doubleBtnArmed: {
    backgroundColor: colors.pink,
  },
  doubleBtnLabel: {
    fontSize: 16,
  },
  cellCounter: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: 'rgba(0,27,135,.5)',
    minWidth: 28,
    textAlign: 'center',
  },
  // FFA bar
  ffaBar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 64,
    backgroundColor: colors.cyan,
  },
  ffaSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  ffaCenter: {
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.navy,
  },
  ffaChip: {
    alignItems: 'center',
    flex: 1,
  },
  ffaName: {
    fontFamily: fontFamily.black,
    fontSize: 10,
    color: 'rgba(0,27,135,.55)',
    textAlign: 'center',
  },
  ffaNameLit: {
    color: colors.navy,
  },
  ffaPoints: {
    fontFamily: fontFamily.black,
    fontSize: 20,
    color: colors.navy,
  },
  ffaPointsLit: {
    color: colors.navy,
  },
  // Wicked overlay
  wickedBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,8,40,.72)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 500,
    elevation: 10,
  },
  wickedCard: {
    backgroundColor: colors.navy,
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 44,
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 260,
  },
  wickedEmoji: {
    fontSize: 56,
  },
  wickedLabel: {
    fontFamily: fontFamily.black,
    fontSize: 24,
    textAlign: 'center',
  },
  wickedDesc: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,.65)',
    textAlign: 'center',
  },
});
