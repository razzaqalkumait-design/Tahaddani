import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { BackBtn } from '../components/BackBtn';
import { colors, fontFamily, radii, spacing } from '../theme/tokens';
import { strings, fill } from '../i18n';
import { dealGuessCards, fetchGuessCategories } from '../api';
import type { GuessCard, GuessCategory } from '../api';
import { useAccount } from '../contexts/AccountContext';
import { makeRoomCode, subscribeRoom, announceJoin, broadcastState, closeRoom } from '../online/helpers';

type UiPhase = 'menu' | 'creating' | 'joining' | 'lobby' | 'playing' | 'result';
type RoomPhase = 'lobby' | 'catpick' | 'playing' | 'result';

interface GuessRoomState {
  phase: RoomPhase;
  catKey?: string;
  cards?: [GuessCard, GuessCard];
  scores: [number, number];
  currentRound: number;
  qCount: [number, number];
  guessing?: number;
  roundHistory: { winner: number; q: [number, number] }[];
  players: { seat: number; name: string }[];
}

const WIN_SCORE = 2;
const ROOM_PREFIX = 'guess_room_';

/**
 * Guess game, ported from the web build's GuessSetupStub. Two players over
 * Supabase Realtime: each sees their own card (served by `get-guess-deal`),
 * the host confirms guesses, first to 2 wins. Card images ship off-device on
 * the web, so cards render as category emoji + name like the web fallback.
 */
export function GuessGameScreen({
  onEnd,
  onBack,
}: {
  onEnd: (scores: [number, number], names: [string, string]) => void;
  onBack: () => void;
}) {
  const { account } = useAccount();
  const [phase, setPhase] = useState<UiPhase>('menu');
  const [myName, setMyName] = useState(() => account?.name ?? '');
  const [guessCats, setGuessCats] = useState<GuessCategory[]>([]);
  const [catsLoading, setCatsLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mySeat, setMySeat] = useState<0 | 1>(0);
  const [catSel, setCatSel] = useState<GuessCategory | null>(null);
  const [err, setErr] = useState('');
  const [room, setRoom] = useState<GuessRoomState>({
    phase: 'lobby',
    players: [],
    scores: [0, 0],
    currentRound: 0,
    qCount: [0, 0],
    roundHistory: [],
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const roomRef = useRef(room);
  roomRef.current = room;

  useEffect(() => {
    let active = true;
    fetchGuessCategories()
      .then((cats) => {
        if (active) setGuessCats(cats);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setCatsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      void closeRoom(channelRef.current);
    };
  }, []);

  const sync = useCallback(
    (update: Partial<GuessRoomState>) => {
      const next = { ...roomRef.current, ...update };
      setRoom(next);
      broadcastState(channelRef.current, next);
    },
    [],
  );

  const openChannel = useCallback(async (code: string, seat: 0 | 1, name: string) => {
    await closeRoom(channelRef.current);
    const channel = await subscribeRoom(
      ROOM_PREFIX + code,
      (payload) => {
        const state = payload as unknown as GuessRoomState;
        const safe: GuessRoomState = {
          phase: state.phase ?? 'lobby',
          catKey: state.catKey,
          cards: state.cards,
          scores: state.scores ?? [0, 0],
          currentRound: state.currentRound ?? 0,
          qCount: state.qCount ?? [0, 0],
          guessing: state.guessing,
          roundHistory: state.roundHistory ?? [],
          players: state.players ?? [],
        };
        setRoom(safe);
        if (safe.phase === 'catpick' || safe.phase === 'playing' || safe.phase === 'result') {
          setPhase((p) => (p === 'menu' || p === 'creating' || p === 'joining' ? 'lobby' : p));
        }
      },
      (joinPayload) => {
        if (seat !== 0) return;
        const next: GuessRoomState = {
          ...roomRef.current,
          phase: 'catpick',
          players: [
            { seat: 0, name },
            { seat: 1, name: joinPayload.name },
          ],
        };
        setRoom(next);
        broadcastState(channelRef.current, next);
        setPhase('lobby');
      },
    );
    channelRef.current = channel;
    if (seat === 1) announceJoin(channel, name);
  }, []);

  const createRoom = async () => {
    if (!myName.trim()) {
      setErr(strings.guess.yourName);
      return;
    }
    const code = makeRoomCode();
    setRoomCode(code);
    setMySeat(0);
    await openChannel(code, 0, myName.trim());
    setPhase('creating');
  };

  const joinRoom = async () => {
    if (!myName.trim()) {
      setErr(strings.guess.yourName);
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

  const dealCards = useCallback(async (catKey: string): Promise<[GuessCard, GuessCard] | null> => {
    try {
      return await dealGuessCards(catKey);
    } catch {
      return null;
    }
  }, []);

  const dealAndStart = async () => {
    if (!catSel) return;
    const cards = await dealCards(catSel.key);
    if (!cards) return;
    sync({ phase: 'playing', catKey: catSel.key, cards, scores: [0, 0], currentRound: 0, qCount: [0, 0], roundHistory: [] });
    setPhase('playing');
  };

  const addQuestion = () => {
    const q: [number, number] = [...roomRef.current.qCount];
    q[mySeat] += 1;
    sync({ qCount: q });
  };

  const declareGuess = () => sync({ guessing: mySeat });

  const confirmGuess = async (correct: boolean) => {
    if (mySeat !== 0) return;
    const cur = roomRef.current;
    const guesser = cur.guessing as 0 | 1 | undefined;
    if (guesser === undefined) return;
    if (!correct) {
      sync({ guessing: undefined });
      return;
    }
    const newScores: [number, number] = [cur.scores[0], cur.scores[1]];
    newScores[guesser] += 1;
    const newHistory = [...cur.roundHistory, { winner: guesser, q: [cur.qCount[0], cur.qCount[1]] as [number, number] }];
    if (newScores[guesser] >= WIN_SCORE) {
      sync({ phase: 'result', scores: newScores, roundHistory: newHistory, guessing: undefined });
      setPhase('result');
    } else {
      const cards = cur.catKey ? await dealCards(cur.catKey) : null;
      if (!cards) return;
      sync({
        cards,
        scores: newScores,
        currentRound: cur.currentRound + 1,
        qCount: [0, 0],
        roundHistory: newHistory,
        guessing: undefined,
      });
    }
  };

  const isHost = mySeat === 0;

  // ── Menu ────────────────────────────────────────────
  if (phase === 'menu') {
    return (
      <View style={styles.menuScreen}>
        <View style={styles.headerRow}>
          <BackBtn onPress={onBack} />
          <Text style={styles.headerTitle}>{strings.guess.title}</Text>
          <View style={styles.onlineBadge}>
            <Text style={styles.onlineBadgeLabel}>{strings.game.online}</Text>
          </View>
        </View>

        <View style={styles.menuBody}>
          <Text style={styles.menuIntro}>{strings.guess.intro}</Text>
          <Text style={styles.menuIntro}>{strings.guess.introSecond}</Text>
          <TextInput
            value={myName}
            onChangeText={setMyName}
            placeholder={strings.guess.yourName}
            placeholderTextColor="rgba(0,27,135,.35)"
            style={styles.menuInput}
            maxLength={20}
          />
          {err ? <Text style={styles.errLabel}>{err}</Text> : null}

          <Pressable style={styles.createBtn} onPress={() => void createRoom()}>
            <Text style={styles.createBtnLabel}>✦ {strings.guess.createRoom}</Text>
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
            <Pressable style={styles.joinBtn} onPress={() => void joinRoom()}>
              <Text style={styles.joinBtnLabel}>{strings.game.joinRoom} →</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // ── Creating / joining ──────────────────────────────
  if (phase === 'creating') {
    return (
      <View style={styles.waitScreen}>
        <Text style={styles.waitTitle}>{strings.guess.roomReady}</Text>
        <View style={styles.codeCard}>
          <Text style={styles.codeKicker}>{strings.game.roomCode}</Text>
          <Text style={styles.codeValue}>{roomCode}</Text>
          <Text style={styles.codeHint}>{strings.guess.shareCode}</Text>
        </View>
        <WaitingPulse label={strings.guess.waiting} />
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
        <Text style={styles.waitSub}>
          {strings.game.roomCode}: <Text style={styles.codeInline}>{roomCode}</Text>
        </Text>
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
          <Text style={styles.headerTitle}>
            {strings.guess.title} — {roomCode}
          </Text>
        </View>

        {bothIn && (
          <View style={styles.playerRow}>
            {room.players.map((p) => (
              <View key={p.seat} style={[styles.playerChip, p.seat === mySeat && styles.playerChipMe]}>
                <Text style={[styles.playerName, p.seat === mySeat && styles.playerNameMe]}>
                  {p.name} {p.seat === mySeat ? `(${strings.guess.you})` : `(${strings.guess.opponent})`}
                </Text>
              </View>
            ))}
          </View>
        )}

        {!bothIn && (
          <View style={styles.waitBody}>
            <View style={styles.codeCard}>
              <Text style={styles.codeKicker}>{strings.game.roomCode}</Text>
              <Text style={styles.codeValue}>{roomCode}</Text>
            </View>
            <WaitingPulse label={strings.guess.waiting} />
          </View>
        )}

        {bothIn && isHost && room.phase === 'catpick' && (
          <>
            <Text style={styles.catTitle}>{strings.game.selectCategory}:</Text>
            <ScrollView contentContainerStyle={styles.catList}>
              {catsLoading ? (
                <Text style={styles.catLoading}>{strings.common.loading}</Text>
              ) : (
                guessCats.map((c) => (
                  <Pressable
                    key={c.key}
                    style={[styles.catRow, catSel?.key === c.key && styles.catRowSelected]}
                    onPress={() => setCatSel((s) => (s?.key === c.key ? null : c))}
                  >
                    <Text style={styles.catEmoji}>{c.emoji}</Text>
                    <Text style={[styles.catName, catSel?.key === c.key && styles.catNameSelected]}>{c.name}</Text>
                    <Text style={styles.catCount}>
                      {c.count} {strings.guess.characters}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
            {catSel ? (
              <View style={styles.dock}>
                <Pressable style={styles.dockBtn} onPress={() => void dealAndStart()}>
                  <Text style={styles.dockBtnLabel}>
                    {strings.game.playNow} <Text style={styles.dockIcon}>▶</Text>
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </>
        )}

        {bothIn && !isHost && room.phase === 'catpick' && (
          <View style={styles.waitBody}>
            <Text style={styles.waitEmoji}>⏳</Text>
            <Text style={styles.waitTitle}>{strings.guess.hostPicks}</Text>
          </View>
        )}
      </View>
    );
  }

  // ── Playing ─────────────────────────────────────────
  if (room.phase === 'playing' && room.cards) {
    const myCard = room.cards[mySeat];
    const cat = guessCats.find((c) => c.key === room.catKey);
    const guessingSeat = room.guessing;
    const askingSeat = room.qCount[0] <= room.qCount[1] ? 0 : 1;
    const isMyTurn = askingSeat === mySeat;
    const askingName = room.players.find((p) => p.seat === askingSeat)?.name ?? '';
    const guessingName = room.players.find((p) => p.seat === guessingSeat)?.name ?? '';

    return (
      <View style={styles.playScreen}>
        {/* Left stats panel */}
        <View style={styles.playLeft}>
          <View style={styles.roundRow}>
            <Text style={styles.roundLabel}>{strings.guess.round}</Text>
            <View style={styles.dotsRow}>
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.roundDot,
                    i < room.currentRound && styles.roundDotDone,
                    i === room.currentRound && styles.roundDotCurrent,
                  ]}
                />
              ))}
            </View>
          </View>

          <View style={styles.scoreRow}>
            {room.players.map((p) => (
              <View key={p.seat} style={[styles.scoreChip, p.seat === mySeat && styles.scoreChipMe]}>
                <Text style={styles.scoreValue}>{room.scores[p.seat]}</Text>
                <Text style={styles.scoreName} numberOfLines={1}>
                  {p.seat === mySeat ? strings.guess.you : p.name}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.qCountBox}>
            <Text style={styles.qCountTitle}>{strings.guess.questionCount}</Text>
            {room.players.map((p) => (
              <View key={p.seat} style={styles.qCountRow}>
                <Text style={styles.qCountName} numberOfLines={1}>
                  {p.seat === mySeat ? strings.guess.you : p.name}
                </Text>
                <Text style={styles.qCountValue}>{room.qCount[p.seat]}</Text>
                {p.seat === mySeat && (
                  <Pressable style={styles.qPlusBtn} onPress={addQuestion}>
                    <Text style={styles.qPlusLabel}>+</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>

          {room.roundHistory.length > 0 && (
            <View style={styles.historyBox}>
              <Text style={styles.qCountTitle}>{strings.guess.roundHistory}</Text>
              {room.roundHistory.map((r, i) => {
                const wName = room.players.find((p) => p.seat === r.winner)?.name ?? '';
                return (
                  <View key={i} style={styles.historyRow}>
                    <Text style={styles.historyRound}>ج{i + 1}</Text>
                    <Text style={styles.historyWinner}>{r.winner === mySeat ? strings.guess.you : wName}</Text>
                    <Text style={styles.historyQ}>
                      {r.q[0]}س/{r.q[1]}س
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Right: card panel */}
        <View style={styles.playRight}>
          <View style={[styles.turnBar, isMyTurn && styles.turnBarMe]}>
            <View style={[styles.turnDot, isMyTurn && styles.turnDotMe]} />
            <Text style={[styles.turnLabel, isMyTurn && styles.turnLabelMe]}>
              {isMyTurn ? strings.guess.yourTurnAsk : fill(strings.guess.turnAsk, { name: askingName })}
            </Text>
          </View>
          <Text style={styles.yourCardLabel}>{strings.guess.yourCard}</Text>

          <View style={styles.cardBox}>
            <View style={styles.card}>
              <Text style={styles.cardEmoji}>{cat?.emoji ?? '❓'}</Text>
              <Text style={styles.cardName}>{myCard.name}</Text>
            </View>
          </View>

          {guessingSeat === undefined ? (
            <Pressable style={styles.knowBtn} onPress={declareGuess}>
              <Text style={styles.knowBtnLabel}>🎯 {strings.guess.iKnow}</Text>
            </Pressable>
          ) : (
            <Text style={styles.guessWaiting}>
              {guessingSeat === mySeat
                ? `⏳ ${strings.guess.waitingHostConfirm}`
                : `🎯 ${fill(strings.guess.thinksTheyKnow, { name: guessingName })}`}
            </Text>
          )}

          {guessingSeat !== undefined && isHost && (
            <View style={styles.confirmOverlay}>
              <Text style={styles.confirmTitle}>
                {guessingSeat === mySeat
                  ? strings.guess.guessRight
                  : fill(strings.guess.guessRight, { name: '' }) || strings.guess.guessRight}
              </Text>
              <Text style={styles.confirmSub}>{strings.guess.verifyVerbally}</Text>
              <View style={styles.confirmButtons}>
                <Pressable style={styles.confirmYes} onPress={() => void confirmGuess(true)}>
                  <Text style={styles.confirmYesLabel}>{strings.guess.correct}</Text>
                </Pressable>
                <Pressable style={styles.confirmNo} onPress={() => void confirmGuess(false)}>
                  <Text style={styles.confirmNoLabel}>{strings.guess.wrong}</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  }

  // ── Result ──────────────────────────────────────────
  if (room.phase === 'result') {
    const winnerSeat = room.scores[0] >= WIN_SCORE ? 0 : 1;
    const won = winnerSeat === mySeat;
    const winnerName = room.players.find((p) => p.seat === winnerSeat)?.name ?? '';
    return (
      <View style={styles.resultScreen}>
        <Text style={styles.resultEmoji}>{won ? '🏆' : '💥'}</Text>
        <Text style={[styles.resultTitle, won ? styles.resultWin : styles.resultLose]}>
          {won ? strings.guess.youWon : fill(strings.guess.opponentWon, { name: winnerName })}
        </Text>

        <View style={styles.resultScores}>
          {room.players.map((p) => (
            <View key={p.seat} style={styles.resultScoreCell}>
              <Text style={styles.resultScoreValue}>{room.scores[p.seat]}</Text>
              <Text style={styles.resultScoreName}>{p.seat === mySeat ? strings.guess.you : p.name}</Text>
            </View>
          ))}
        </View>

        {room.roundHistory.length > 0 && (
          <View style={styles.resultHistory}>
            <Text style={styles.qCountTitle}>{strings.guess.roundResults}</Text>
            {room.roundHistory.map((r, i) => {
              const wName = room.players.find((p) => p.seat === r.winner)?.name ?? '';
              return (
                <View key={i} style={styles.historyRow}>
                  <Text style={styles.historyRound}>
                    {strings.guess.round} {i + 1}
                  </Text>
                  <Text style={styles.historyWinner}>{r.winner === mySeat ? strings.guess.you : wName}</Text>
                  <Text style={styles.historyQ}>
                    {r.q[0]}س / {r.q[1]}س
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.resultButtons}>
          <Pressable
            style={styles.resultPrimary}
            onPress={() => {
              if (isHost) {
                setCatSel(null);
                sync({
                  phase: 'catpick',
                  cards: undefined,
                  scores: [0, 0],
                  currentRound: 0,
                  qCount: [0, 0],
                  roundHistory: [],
                  guessing: undefined,
                });
              } else {
                setPhase('menu');
              }
            }}
          >
            <Text style={styles.resultPrimaryLabel}>
              {isHost ? strings.game.playAgain : strings.game.menu} →
            </Text>
          </Pressable>
          <Pressable
            style={styles.ghostBtn}
            onPress={() => onEnd([room.scores[0], room.scores[1]], [room.players[0]?.name ?? '', room.players[1]?.name ?? ''])}
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
  menuIntro: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 24,
    color: 'rgba(0,27,135,.6)',
    textAlign: 'center',
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
  waitSub: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: 'rgba(0,27,135,.55)',
  },
  waitEmoji: {
    fontSize: 48,
  },
  codeInline: {
    fontFamily: fontFamily.black,
    letterSpacing: 4,
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
  codeKicker: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,.55)',
  },
  codeValue: {
    fontFamily: fontFamily.black,
    fontSize: 52,
    color: colors.cyan,
    letterSpacing: 10,
  },
  codeHint: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,.4)',
    marginTop: 6,
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
  playerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  playerChip: {
    flex: 1,
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    padding: spacing.md,
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
  waitBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  catTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: colors.navy,
  },
  catList: {
    gap: spacing.md,
    paddingBottom: 110,
  },
  catLoading: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: 'rgba(0,27,135,.5)',
    textAlign: 'center',
    padding: spacing.lg,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.cyan,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  catRowSelected: {
    backgroundColor: colors.navy,
    borderColor: colors.cyan,
  },
  catEmoji: {
    fontSize: 26,
  },
  catName: {
    fontFamily: fontFamily.bold,
    fontSize: 17,
    color: colors.navy,
  },
  catNameSelected: {
    color: colors.cyan,
  },
  catCount: {
    marginLeft: 'auto',
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: 'rgba(0,27,135,.45)',
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
  playScreen: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  playLeft: {
    flex: 0.9,
    backgroundColor: colors.navy,
    padding: spacing.md,
    gap: spacing.md,
    justifyContent: 'center',
  },
  roundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  roundLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,.45)',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 5,
  },
  roundDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,.18)',
  },
  roundDotDone: {
    backgroundColor: colors.green,
  },
  roundDotCurrent: {
    backgroundColor: colors.cyan,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scoreChip: {
    flex: 1,
    backgroundColor: colors.cyan,
    borderRadius: radii.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  scoreChipMe: {
    backgroundColor: colors.cyan,
    borderWidth: 2,
    borderColor: colors.green,
  },
  scoreValue: {
    fontFamily: fontFamily.black,
    fontSize: 30,
    color: colors.navy,
  },
  scoreName: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: 'rgba(0,27,135,.6)',
  },
  qCountBox: {
    backgroundColor: 'rgba(255,255,255,.07)',
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  qCountTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: colors.cyan,
    letterSpacing: 1,
  },
  qCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  qCountName: {
    flex: 1,
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: 'rgba(255,255,255,.7)',
  },
  qCountValue: {
    fontFamily: fontFamily.black,
    fontSize: 20,
    color: colors.offWhite,
    minWidth: 28,
    textAlign: 'center',
  },
  qPlusBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qPlusLabel: {
    fontFamily: fontFamily.black,
    fontSize: 13,
    color: colors.navy,
  },
  historyBox: {
    gap: 4,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(48,231,237,.08)',
    borderRadius: radii.sm,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  historyRound: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: 'rgba(255,255,255,.3)',
  },
  historyWinner: {
    flex: 1,
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.green,
  },
  historyQ: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: 'rgba(255,255,255,.25)',
  },
  playRight: {
    flex: 1.1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  turnBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'stretch',
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  turnBarMe: {
    backgroundColor: colors.cyan,
  },
  turnDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.cyan,
  },
  turnDotMe: {
    backgroundColor: colors.navy,
  },
  turnLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.cyan,
  },
  turnLabelMe: {
    color: colors.navy,
  },
  yourCardLabel: {
    alignSelf: 'flex-start',
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: 'rgba(0,27,135,.4)',
  },
  cardBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    aspectRatio: 3 / 4,
    height: '100%',
    maxHeight: 220,
    backgroundColor: colors.cyan,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    shadowColor: colors.navy,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 10,
  },
  cardEmoji: {
    fontSize: 64,
  },
  cardName: {
    fontFamily: fontFamily.black,
    fontSize: 22,
    color: colors.navy,
    textAlign: 'center',
  },
  knowBtn: {
    alignSelf: 'stretch',
    backgroundColor: colors.cyan,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: colors.navy,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  knowBtnLabel: {
    fontFamily: fontFamily.black,
    fontSize: 17,
    color: colors.navy,
  },
  guessWaiting: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.navy,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  confirmOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,27,135,.97)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
    zIndex: 20,
  },
  confirmTitle: {
    fontFamily: fontFamily.black,
    fontSize: 18,
    color: colors.cyan,
    textAlign: 'center',
  },
  confirmSub: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,.45)',
    textAlign: 'center',
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
  confirmYes: {
    flex: 1,
    backgroundColor: colors.green,
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmYesLabel: {
    fontFamily: fontFamily.black,
    fontSize: 18,
    color: colors.navy,
  },
  confirmNo: {
    flex: 1,
    backgroundColor: colors.pink,
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmNoLabel: {
    fontFamily: fontFamily.black,
    fontSize: 18,
    color: colors.offWhite,
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
    fontSize: 64,
  },
  resultTitle: {
    fontFamily: fontFamily.black,
    fontSize: 30,
    textAlign: 'center',
  },
  resultWin: {
    color: colors.green,
  },
  resultLose: {
    color: colors.pink,
  },
  resultScores: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  resultScoreCell: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: 28,
  },
  resultScoreValue: {
    fontFamily: fontFamily.black,
    fontSize: 40,
    color: colors.green,
  },
  resultScoreName: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,.6)',
  },
  resultHistory: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(0,27,135,.06)',
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: 4,
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
