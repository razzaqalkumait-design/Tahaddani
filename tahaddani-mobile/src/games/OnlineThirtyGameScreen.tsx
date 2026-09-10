import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { BackBtn } from '../components/BackBtn';
import { colors, fontFamily, radii, spacing } from '../theme/tokens';
import { strings } from '../i18n';
import { THIRTY_CATS_UNIQUE, pickRandomThirtyCategory } from '../games/thirty';
import { fetchThirtyQuestion } from '../api';
import { useAccount } from '../contexts/AccountContext';
import { makeRoomCode, subscribeRoom, announceJoin, broadcastState, closeRoom } from '../online/helpers';
import type { OnlineSeat } from '../online/helpers';

type UiPhase = 'menu' | 'creating' | 'joining' | 'game';

interface OnlineThirtyState {
  phase: 'lobby' | 'catpick' | 'bidding' | 'playing' | 'result';
  players: { seat: number; name: string }[];
  catKey?: string;
  question?: { category: string; question: string; answers: string[]; note?: string };
  bid: number;
  turnSeat: number;
  lastBidSeat: number;
  bidderSeat: number;
  checked: boolean[];
  timeLeft: number;
  timerRunning: boolean;
}

const ROOM_PREFIX = 'othirty_';
const THIRTY_ONLINE_TIMER = 60;

/**
 * Online Thirty, ported from the web build's OnlineThirtyGame: the host picks
 * the category, players bid, the bidder answers out loud while the judge
 * ticks the correct answers. The host's device runs the round timer.
 */
export function OnlineThirtyGameScreen({
  onEnd,
  onBack,
  autoJoinCode,
  hostCode,
}: {
  onEnd: (scores: [number, number], names: [string, string]) => void;
  onBack: () => void;
  autoJoinCode?: string;
  hostCode?: string;
}) {
  const { account } = useAccount();
  const [phase, setPhase] = useState<UiPhase>('menu');
  const [myName, setMyName] = useState(() => account?.name ?? '');
  const [joinCode, setJoinCode] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mySeat, setMySeat] = useState<OnlineSeat>(0);
  const [err, setErr] = useState('');
  const [selCat, setSelCat] = useState<string | null>(null);
  const [room, setRoom] = useState<OnlineThirtyState>({
    phase: 'lobby',
    players: [],
    bid: 1,
    turnSeat: 0,
    lastBidSeat: -1,
    bidderSeat: -1,
    checked: [],
    timeLeft: THIRTY_ONLINE_TIMER,
    timerRunning: false,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const roomRef = useRef(room);
  roomRef.current = room;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      void closeRoom(channelRef.current);
    };
  }, []);

  // The host's device is the timer authority for the playing phase.
  useEffect(() => {
    if (!room.timerRunning || room.timeLeft <= 0) return;
    if (mySeat !== 0) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const next = { ...roomRef.current, timeLeft: roomRef.current.timeLeft - 1 };
      if (next.timeLeft <= 0) {
        next.timerRunning = false;
        next.phase = 'result';
      }
      setRoom(next);
      broadcastState(channelRef.current, next);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [room.timerRunning, mySeat]);

  const sync = useCallback((update: Partial<OnlineThirtyState>) => {
    const next = { ...roomRef.current, ...update };
    setRoom(next);
    broadcastState(channelRef.current, next);
  }, []);

  const openChannel = useCallback(async (code: string, seat: OnlineSeat, name: string) => {
    await closeRoom(channelRef.current);
    const channel = await subscribeRoom(
      ROOM_PREFIX + code,
      (payload) => {
        const state = payload as unknown as OnlineThirtyState;
        setRoom({
          phase: state.phase ?? 'lobby',
          players: state.players ?? [],
          catKey: state.catKey,
          question: state.question,
          bid: state.bid ?? 1,
          turnSeat: state.turnSeat ?? 0,
          lastBidSeat: state.lastBidSeat ?? -1,
          bidderSeat: state.bidderSeat ?? -1,
          checked: state.checked ?? [],
          timeLeft: state.timeLeft ?? THIRTY_ONLINE_TIMER,
          timerRunning: state.timerRunning ?? false,
        });
        if (state.phase === 'catpick' || state.phase === 'bidding' || state.phase === 'playing' || state.phase === 'result') {
          setPhase('game');
        }
      },
      (joinPayload) => {
        if (seat !== 0) return;
        const next: OnlineThirtyState = {
          ...roomRef.current,
          phase: 'catpick',
          players: [
            { seat: 0, name },
            { seat: 1, name: joinPayload.name },
          ],
        };
        setRoom(next);
        broadcastState(channelRef.current, next);
        setPhase('game');
      },
    );
    channelRef.current = channel;
    if (seat === 1) announceJoin(channel, name);
  }, []);

  // auto-join when launched from a friend invite (web OnlineClassicGame)
  useEffect(() => {
    if (!autoJoinCode || !myName.trim()) return;
    const code = autoJoinCode.toUpperCase();
    setRoomCode(code);
    setMySeat(1);
    void openChannel(code, 1, myName.trim()).then(() => setPhase('joining'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoJoinCode]);

  // host a room when launched from a challenge (web OnlineClassicGame)
  useEffect(() => {
    if (!hostCode || !myName.trim()) return;
    const code = hostCode.toUpperCase();
    setRoomCode(code);
    setMySeat(0);
    void openChannel(code, 0, myName.trim()).then(() => setPhase('creating'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostCode]);

  const create = async () => {
    if (!myName.trim()) {
      setErr(strings.game.enterName);
      return;
    }
    const code = makeRoomCode();
    setRoomCode(code);
    setMySeat(0);
    await openChannel(code, 0, myName.trim());
    setPhase('creating');
  };

  const join = async () => {
    if (!myName.trim()) {
      setErr(strings.game.enterName);
      return;
    }
    if (joinCode.trim().length < 4) {
      setErr(strings.game.roomCode);
      return;
    }
    const code = joinCode.trim().toUpperCase();
    setRoomCode(code);
    setMySeat(1);
    await openChannel(code, 1, myName.trim());
    setPhase('joining');
  };

  const startBidding = async () => {
    const chosen = selCat === '🎲' ? pickRandomThirtyCategory() : selCat;
    if (!chosen) return;
    const q = await fetchThirtyQuestion(chosen).catch(() => null);
    if (!q) return;
    sync({
      phase: 'bidding',
      catKey: chosen,
      question: q,
      bid: 1,
      turnSeat: 0,
      lastBidSeat: -1,
      bidderSeat: -1,
      checked: new Array(q.answers.length).fill(false),
      timeLeft: THIRTY_ONLINE_TIMER,
      timerRunning: false,
    });
    setPhase('game');
  };

  const raiseBid = () => {
    if (room.turnSeat !== mySeat) return;
    sync({ bid: room.bid + 1, lastBidSeat: mySeat, turnSeat: mySeat === 0 ? 1 : 0 });
  };

  const passBid = () => {
    if (room.turnSeat !== mySeat) return;
    const bidder = (mySeat === 0 ? 1 : 0) as OnlineSeat;
    sync({ phase: 'playing', bidderSeat: bidder, timerRunning: true });
  };

  const toggleCheck = (i: number) => {
    const checked = [...room.checked];
    checked[i] = !checked[i];
    sync({ checked });
  };

  const endPlaying = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    sync({ phase: 'result', timerRunning: false });
    setPhase('game');
  };

  const isHost = mySeat === 0;
  const { question, bid, turnSeat, lastBidSeat, bidderSeat, checked, timeLeft } = room;
  const correct = checked.filter(Boolean).length;
  const won = correct >= bid;
  const myTurnBid = turnSeat === mySeat;
  const canPass = bid > 1 && lastBidSeat !== mySeat;
  const isBidder = bidderSeat === mySeat;

  // ── Menu ────────────────────────────────────────────
  if (phase === 'menu') {
    return (
      <View style={styles.menuScreen}>
        <View style={styles.headerRow}>
          <BackBtn onPress={onBack} />
          <Text style={styles.headerTitle}>⏱ {strings.thirty.title} — {strings.game.online}</Text>
          <View style={styles.onlineBadge}>
            <Text style={styles.onlineBadgeLabel}>{strings.game.online}</Text>
          </View>
        </View>
        <View style={styles.menuBody}>
          <TextInput
            value={myName}
            onChangeText={setMyName}
            placeholder={strings.game.enterName}
            placeholderTextColor="rgba(0,27,135,.35)"
            style={styles.menuInput}
            maxLength={20}
          />
          {err ? <Text style={styles.errLabel}>{err}</Text> : null}
          <Pressable style={styles.createBtn} onPress={() => void create()}>
            <Text style={styles.createBtnLabel}>✦ {strings.game.createRoom}</Text>
          </Pressable>
          <View style={styles.joinRow}>
            <TextInput
              value={joinCode}
              onChangeText={(t) => setJoinCode(t.toUpperCase())}
              placeholder={strings.game.roomCode}
              placeholderTextColor="rgba(0,27,135,.35)"
              style={[styles.menuInput, styles.codeInput]}
              autoCapitalize="characters"
              maxLength={6}
            />
            <Pressable style={styles.joinBtn} onPress={() => void join()}>
              <Text style={styles.joinBtnLabel}>{strings.game.joinRoom} →</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  if (phase === 'creating') {
    return (
      <View style={styles.waitScreen}>
        <Text style={styles.waitTitle}>{strings.guess.roomReady}</Text>
        <View style={styles.codeCard}>
          <Text style={styles.codeValue}>{roomCode}</Text>
        </View>
        <WaitingPulse label={strings.game.waitingOpponent} />
        <Pressable style={styles.ghostBtn} onPress={() => setPhase('menu')}>
          <Text style={styles.ghostBtnLabel}>{strings.game.cancel}</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === 'joining') {
    return (
      <View style={styles.waitScreen}>
        <Text style={styles.waitEmoji}>🔌</Text>
        <Text style={styles.waitTitle}>{strings.game.connecting}</Text>
      </View>
    );
  }

  // ── Lobby / catpick ─────────────────────────────────
  if (room.phase === 'lobby' || room.phase === 'catpick') {
    const bothIn = room.players.length === 2;
    return (
      <View style={styles.lobbyScreen}>
        <View style={styles.headerRow}>
          <BackBtn onPress={() => setPhase('menu')} />
          <Text style={styles.headerTitle}>⏱ {strings.thirty.title} — {strings.game.online}</Text>
        </View>

        {!bothIn ? (
          <View style={styles.waitBody}>
            <View style={styles.codeCard}>
              <Text style={styles.codeValue}>{roomCode}</Text>
            </View>
            <WaitingPulse label={strings.game.waitingOpponent} />
          </View>
        ) : isHost ? (
          <>
            <View style={styles.playerRow}>
              {room.players.map((p) => (
                <View key={p.seat} style={[styles.playerChip, p.seat === 0 && styles.playerChipMe]}>
                  <Text style={[styles.playerName, p.seat === 0 && styles.playerNameMe]}>{p.name}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.catTitle}>{strings.game.selectCategory}:</Text>
            <ScrollView contentContainerStyle={styles.catGrid}>
              {THIRTY_CATS_UNIQUE.map((c) => (
                <Pressable
                  key={c}
                  style={[styles.catChip, selCat === c && styles.catChipSelected]}
                  onPress={() => setSelCat((s) => (s === c ? null : c))}
                >
                  <Text style={[styles.catChipLabel, selCat === c && styles.catChipLabelSelected]}>{c}</Text>
                </Pressable>
              ))}
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
                <Pressable style={styles.dockBtn} onPress={() => void startBidding()}>
                  <Text style={styles.dockBtnLabel}>
                    {strings.game.start} <Text style={styles.dockIcon}>▶</Text>
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.waitBody}>
            <Text style={styles.waitEmoji}>⏳</Text>
            <Text style={styles.waitTitle}>{strings.game.waitingHost}</Text>
          </View>
        )}
      </View>
    );
  }

  // ── Bidding ─────────────────────────────────────────
  if (room.phase === 'bidding' && question) {
    return (
      <View style={styles.biddingScreen}>
        <View style={styles.biddingHeader}>
          <Text style={styles.biddingTitle}>
            {strings.thirty.auction} — {question.category}
          </Text>
          <Text style={styles.biddingCode}>{roomCode}</Text>
        </View>
        <View style={styles.biddingQuestion}>
          <Text style={styles.biddingQuestionText}>{question.question}</Text>
          {question.note ? <Text style={styles.biddingNote}>ملاحظة: {question.note}</Text> : null}
        </View>
        <Text style={styles.bidLabel}>{strings.thirty.answerCount}</Text>
        <Text style={styles.bidValue}>{bid}</Text>
        <Text style={styles.bidTurn}>
          {strings.thirty.turnLabel}:{' '}
          <Text style={styles.bidTurnName}>
            {room.players.find((p) => p.seat === turnSeat)?.name ?? ''}
            {myTurnBid ? ` (${strings.guess.you})` : ''}
          </Text>
        </Text>
        <View style={styles.bidButtons}>
          <Pressable style={[styles.raiseBtn, !myTurnBid && styles.btnDisabled]} disabled={!myTurnBid} onPress={raiseBid}>
            <Text style={styles.raiseBtnLabel}>{strings.thirty.raise}</Text>
          </Pressable>
          <Pressable
            style={[styles.passBtn, (!myTurnBid || !canPass) && styles.btnDisabled]}
            disabled={!myTurnBid || !canPass}
            onPress={passBid}
          >
            <Text style={styles.passBtnLabel}>{strings.thirty.pass}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Playing ─────────────────────────────────────────
  if (room.phase === 'playing' && question) {
    return (
      <View style={styles.playingScreen}>
        <View style={styles.playingHeader}>
          <View>
            <Text style={styles.bidderLabel}>
              {room.players.find((p) => p.seat === bidderSeat)?.name ?? ''} {strings.game.answer}
            </Text>
            <Text style={styles.bidderSub}>
              {strings.thirty.mustAnswer} {bid} {strings.thirty.answer}
            </Text>
          </View>
          <View style={[styles.timerBox, timeLeft <= 10 && styles.timerBoxUrgent]}>
            <Text style={[styles.timerText, timeLeft <= 10 && styles.timerTextUrgent]}>{timeLeft}s</Text>
          </View>
        </View>

        <View style={styles.playingQuestion}>
          <Text style={styles.playingQuestionText}>{question.question}</Text>
        </View>

        <Text style={styles.playingCount}>
          ✅ {correct} / {bid}
        </Text>

        <View style={styles.answerGrid}>
          {question.answers.map((a, i) => (
            <Pressable
              key={i}
              style={[styles.answerChip, checked[i] && styles.answerChipChecked]}
              onPress={() => !isBidder && toggleCheck(i)}
              disabled={isBidder}
            >
              <Text style={[styles.answerChipLabel, checked[i] && styles.answerChipLabelChecked]}>
                {checked[i] ? '✓ ' : ''}
                {a}
              </Text>
            </Pressable>
          ))}
        </View>

        {!isBidder ? (
          <Pressable style={[styles.endBtn, won && styles.endBtnWon]} onPress={endPlaying}>
            <Text style={styles.endBtnLabel}>{strings.thirty.endRound}</Text>
          </Pressable>
        ) : (
          <Text style={styles.bidderHint}>قُلِ الإجابات بصوت عالٍ — خصمك يعلّمها</Text>
        )}
      </View>
    );
  }

  // ── Result ──────────────────────────────────────────
  if (room.phase === 'result' && question) {
    const bidderName = room.players.find((p) => p.seat === bidderSeat)?.name ?? '';
    return (
      <View style={styles.resultScreen}>
        <Text style={styles.resultEmoji}>{won ? '🏆' : '💥'}</Text>
        <Text style={[styles.resultTitle, won ? styles.resultWin : styles.resultLose]}>
          {won ? strings.thirty.great : strings.thirty.timeUp}
        </Text>
        <Text style={styles.resultDetail}>
          {bidderName} {strings.thirty.answeredOf} <Text style={styles.resultBold}>{correct}</Text>{' '}
          {strings.thirty.outOf} <Text style={styles.resultBold}>{bid}</Text>
        </Text>
        <View style={styles.resultAnswers}>
          <Text style={styles.resultAnswersTitle}>{strings.thirty.allAnswers}:</Text>
          <View style={styles.answerGrid}>
            {question.answers.map((a, i) => (
              <View key={i} style={[styles.answerChip, checked[i] ? styles.answerChipChecked : styles.answerChipWrong]}>
                <Text style={[styles.answerChipLabel, (checked[i] || true) && styles.answerChipLabelChecked]}>{a}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.resultButtons}>
          {isHost ? (
            <Pressable
              style={styles.resultPrimary}
              onPress={() => {
                setSelCat(null);
                sync({
                  phase: 'catpick',
                  question: undefined,
                  bid: 1,
                  turnSeat: 0,
                  lastBidSeat: -1,
                  bidderSeat: -1,
                  checked: [],
                  timeLeft: THIRTY_ONLINE_TIMER,
                  timerRunning: false,
                });
              }}
            >
              <Text style={styles.resultPrimaryLabel}>{strings.game.playAgain} ↺</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={styles.ghostBtn}
            onPress={() => onEnd([0, 0], [room.players[0]?.name ?? '', room.players[1]?.name ?? ''])}
          >
            <Text style={styles.ghostBtnLabel}>{strings.game.menu}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.waitScreen}>
      <View style={styles.spinner} />
      <Text style={styles.waitTitle}>{strings.game.loadingQuestions}</Text>
    </View>
  );
}

function WaitingPulse({ label }: { label: string }) {
  return (
    <View style={styles.waitingRow}>
      <View style={styles.pulseDot} />
      <Text style={styles.waitingLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  menuScreen: {
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
    flexShrink: 1,
  },
  onlineBadge: {
    marginLeft: 'auto',
    backgroundColor: colors.green,
    borderRadius: radii.md,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  onlineBadgeLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.navy,
  },
  menuBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 440,
    paddingHorizontal: spacing.xl,
  },
  menuInput: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(0,27,135,.07)',
    borderWidth: 2,
    borderColor: 'rgba(0,27,135,.3)',
    borderRadius: radii.md,
    padding: spacing.md,
    color: colors.navy,
    fontFamily: fontFamily.bold,
    fontSize: 17,
    textAlign: 'right',
  },
  codeInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    letterSpacing: 4,
  },
  errLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.pink,
  },
  createBtn: {
    alignSelf: 'stretch',
    backgroundColor: colors.cyan,
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: colors.navy,
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  createBtnLabel: {
    fontFamily: fontFamily.black,
    fontSize: 18,
    color: colors.navy,
  },
  joinRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
  joinBtn: {
    backgroundColor: colors.navy,
    borderWidth: 2,
    borderColor: colors.cyan,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: 22,
    justifyContent: 'center',
  },
  joinBtnLabel: {
    fontFamily: fontFamily.black,
    fontSize: 16,
    color: colors.cyan,
  },
  waitScreen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  spinner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 4,
    borderColor: 'rgba(0,27,135,.15)',
    borderTopColor: colors.navy,
  },
  waitTitle: {
    fontFamily: fontFamily.black,
    fontSize: 20,
    color: colors.navy,
    textAlign: 'center',
  },
  waitEmoji: {
    fontSize: 48,
  },
  codeCard: {
    backgroundColor: colors.navy,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 44,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.cyan,
  },
  codeValue: {
    fontFamily: fontFamily.black,
    fontSize: 52,
    color: colors.cyan,
    letterSpacing: 10,
  },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.green,
  },
  waitingLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: colors.navy,
  },
  ghostBtn: {
    borderWidth: 1,
    borderColor: 'rgba(0,27,135,.2)',
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  ghostBtnLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: 'rgba(0,27,135,.55)',
  },
  lobbyScreen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.md,
  },
  waitBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  playerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  playerChip: {
    flex: 1,
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  playerChipMe: {
    backgroundColor: colors.cyan,
  },
  playerName: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.cyan,
  },
  playerNameMe: {
    color: colors.navy,
  },
  catTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.navy,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingBottom: 110,
    justifyContent: 'center',
  },
  catChip: {
    backgroundColor: colors.cyan,
    borderRadius: radii.md,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  catChipSelected: {
    backgroundColor: colors.navy,
    borderColor: colors.cyan,
  },
  catChipLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
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
  biddingScreen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  biddingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  biddingTitle: {
    fontFamily: fontFamily.black,
    fontSize: 18,
    color: colors.navy,
  },
  biddingCode: {
    fontFamily: fontFamily.black,
    fontSize: 13,
    color: colors.navy,
    backgroundColor: 'rgba(0,27,135,.1)',
    borderRadius: radii.sm,
    paddingVertical: 4,
    paddingHorizontal: 12,
    letterSpacing: 3,
  },
  biddingQuestion: {
    backgroundColor: colors.navy,
    borderRadius: radii.card,
    padding: spacing.lg,
    maxWidth: 540,
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.cyan,
  },
  biddingQuestionText: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    lineHeight: 30,
    color: colors.offWhite,
    textAlign: 'center',
  },
  biddingNote: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.cyan,
  },
  bidLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: 'rgba(0,27,135,.5)',
  },
  bidValue: {
    fontFamily: fontFamily.black,
    fontSize: 72,
    color: colors.cyan,
  },
  bidTurn: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: colors.navy,
  },
  bidTurnName: {
    fontFamily: fontFamily.black,
    color: colors.cyan,
  },
  bidButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
    maxWidth: 400,
  },
  btnDisabled: {
    opacity: 0.3,
  },
  raiseBtn: {
    flex: 1,
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
  raiseBtnLabel: {
    fontFamily: fontFamily.black,
    fontSize: 18,
    color: colors.navy,
  },
  passBtn: {
    flex: 1,
    backgroundColor: colors.pink,
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  passBtnLabel: {
    fontFamily: fontFamily.black,
    fontSize: 18,
    color: colors.offWhite,
  },
  playingScreen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.md,
  },
  playingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bidderLabel: {
    fontFamily: fontFamily.black,
    fontSize: 16,
    color: colors.navy,
  },
  bidderSub: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: 'rgba(0,27,135,.5)',
  },
  timerBox: {
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    paddingVertical: 8,
    paddingHorizontal: 18,
    minWidth: 70,
    alignItems: 'center',
  },
  timerBoxUrgent: {
    backgroundColor: colors.pink,
  },
  timerText: {
    fontFamily: fontFamily.black,
    fontSize: 32,
    color: colors.offWhite,
  },
  timerTextUrgent: {
    color: colors.offWhite,
  },
  playingQuestion: {
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  playingQuestionText: {
    fontFamily: fontFamily.bold,
    fontSize: 17,
    color: colors.offWhite,
    textAlign: 'center',
  },
  playingCount: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.cyan,
  },
  answerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  answerChip: {
    backgroundColor: 'rgba(0,27,135,.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,27,135,.2)',
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  answerChipChecked: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  answerChipWrong: {
    backgroundColor: 'rgba(255,61,104,.3)',
    borderColor: colors.pink,
  },
  answerChipLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.navy,
  },
  answerChipLabelChecked: {
    color: colors.navy,
  },
  endBtn: {
    backgroundColor: colors.pink,
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  endBtnWon: {
    backgroundColor: colors.green,
  },
  endBtnLabel: {
    fontFamily: fontFamily.black,
    fontSize: 18,
    color: colors.offWhite,
  },
  bidderHint: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: 'rgba(0,27,135,.5)',
    textAlign: 'center',
  },
  resultScreen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  resultEmoji: {
    fontSize: 72,
  },
  resultTitle: {
    fontFamily: fontFamily.black,
    fontSize: 32,
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
    fontSize: 17,
    color: colors.navy,
    textAlign: 'center',
  },
  resultBold: {
    fontFamily: fontFamily.black,
    color: colors.cyan,
  },
  resultAnswers: {
    backgroundColor: 'rgba(0,27,135,.06)',
    borderRadius: radii.lg,
    padding: spacing.md,
    width: '100%',
    maxWidth: 480,
    gap: spacing.sm,
  },
  resultAnswersTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.cyan,
  },
  resultButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  resultPrimary: {
    backgroundColor: colors.cyan,
    borderRadius: radii.md,
    paddingVertical: 13,
    paddingHorizontal: 28,
    shadowColor: colors.navy,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  resultPrimaryLabel: {
    fontFamily: fontFamily.black,
    fontSize: 16,
    color: colors.navy,
  },
});
