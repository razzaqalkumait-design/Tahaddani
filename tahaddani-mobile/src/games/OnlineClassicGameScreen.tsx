import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { BackBtn } from '../components/BackBtn';
import { QuestionPanel } from '../components/QuestionPanel';
import { ScoreBar, TurnLabel } from '../components/ScoreBar';
import { colors, fontFamily, radii, spacing } from '../theme/tokens';
import { strings } from '../i18n';
import { TIERS, loadQuestionsForGame, pickQuestion, playableGroups } from '../games/board';
import { useAccount } from '../contexts/AccountContext';
import { makeRoomCode, subscribeRoom, announceJoin, broadcastState, closeRoom } from '../online/helpers';
import type { OnlineSeat } from '../online/helpers';

type UiPhase = 'menu' | 'creating' | 'joining' | 'game' | 'result';

interface OnlineClassicState {
  phase: 'lobby' | 'catpick' | 'game' | 'result';
  wicked: boolean;
  players: { seat: number; name: string }[];
  cats: string[];
  usedCells: string[];
  current: { group: string; tier: number; q: { question: string; answer: string } } | null;
  showAnswer: boolean;
  activeSeat: number;
  scores: [number, number];
}

const ROOM_PREFIX = 'oclassic_';

/**
 * Online classic/wicked, ported from the web build's OnlineClassicGame.
 * Seat 0 hosts: picks categories and judges answers; the answering seat
 * picks cells. The room state travels over Supabase Realtime broadcasts.
 */
export function OnlineClassicGameScreen({
  wicked,
  onEnd,
  onBack,
}: {
  wicked: boolean;
  onEnd: (scores: [number, number], names: [string, string]) => void;
  onBack: () => void;
}) {
  const { account } = useAccount();
  const [phase, setPhase] = useState<UiPhase>('menu');
  const [myName, setMyName] = useState(() => account?.name ?? '');
  const [joinCode, setJoinCode] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mySeat, setMySeat] = useState<OnlineSeat>(0);
  const [err, setErr] = useState('');
  const [selCats, setSelCats] = useState<string[]>([]);
  const [questionsReady, setQuestionsReady] = useState(false);
  const [room, setRoom] = useState<OnlineClassicState>({
    phase: 'lobby',
    wicked,
    players: [],
    cats: [],
    usedCells: [],
    current: null,
    showAnswer: false,
    activeSeat: 0,
    scores: [0, 0],
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const roomRef = useRef(room);
  roomRef.current = room;

  useEffect(() => {
    return () => {
      void closeRoom(channelRef.current);
    };
  }, []);

  // Questions load lazily the first time the game phase renders.
  useEffect(() => {
    if (room.phase !== 'game') return;
    let active = true;
    setQuestionsReady(false);
    loadQuestionsForGame(room.cats)
      .catch(() => {})
      .then(() => {
        if (active) setQuestionsReady(true);
      });
    return () => {
      active = false;
    };
  }, [room.phase, room.cats]);

  const sync = useCallback((update: Partial<OnlineClassicState>) => {
    const next = { ...roomRef.current, ...update };
    setRoom(next);
    broadcastState(channelRef.current, next);
  }, []);

  const openChannel = useCallback(async (code: string, seat: OnlineSeat, name: string) => {
    await closeRoom(channelRef.current);
    const channel = await subscribeRoom(
      ROOM_PREFIX + code,
      (payload) => {
        const state = payload as unknown as OnlineClassicState;
        setRoom({
          phase: state.phase ?? 'lobby',
          wicked: state.wicked ?? false,
          players: state.players ?? [],
          cats: state.cats ?? [],
          usedCells: state.usedCells ?? [],
          current: state.current ?? null,
          showAnswer: state.showAnswer ?? false,
          activeSeat: state.activeSeat ?? 0,
          scores: state.scores ?? [0, 0],
        });
        if (state.phase === 'catpick' || state.phase === 'game') setPhase('game');
        if (state.phase === 'result') setPhase('result');
      },
      (joinPayload) => {
        if (seat !== 0) return;
        const next: OnlineClassicState = {
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

  const startGame = () => {
    if (selCats.length < 2) return;
    sync({
      phase: 'game',
      cats: selCats,
      usedCells: [],
      current: null,
      showAnswer: false,
      activeSeat: 0,
      scores: [0, 0],
    });
    setPhase('game');
  };

  const pickCell = (group: string, tier: number) => {
    if (mySeat !== room.activeSeat) return;
    if (room.usedCells.includes(group + '_' + tier)) return;
    const q = pickQuestion(group, tier);
    if (!q) return;
    sync({ current: { group, tier, q: { question: q.question, answer: q.answer } }, showAnswer: false });
  };

  const revealAnswer = () => {
    if (mySeat !== 0) return;
    sync({ showAnswer: true });
  };

  const markResult = (correct: boolean) => {
    if (mySeat !== 0) return;
    const cur = roomRef.current.current;
    if (!cur) return;
    const scores: [number, number] = [...roomRef.current.scores];
    if (correct) {
      if (room.activeSeat === 0) scores[0] += cur.tier;
      else scores[1] += cur.tier;
    }
    const used = [...roomRef.current.usedCells, cur.group + '_' + cur.tier];
    const nextSeat = (room.activeSeat === 0 ? 1 : 0) as OnlineSeat;
    const allUsed = room.cats.every((g) => TIERS.every((t) => used.includes(g + '_' + t)));
    if (allUsed) {
      sync({ phase: 'result', scores, usedCells: used, current: null });
      setPhase('result');
    } else {
      sync({ scores, usedCells: used, current: null, showAnswer: false, activeSeat: nextSeat });
    }
  };

  const isHost = mySeat === 0;
  const p0 = room.players.find((p) => p.seat === 0);
  const p1 = room.players.find((p) => p.seat === 1);

  // ── Menu ────────────────────────────────────────────
  if (phase === 'menu') {
    return (
      <View style={styles.menuScreen}>
        <View style={styles.headerRow}>
          <BackBtn onPress={onBack} />
          <Text style={styles.headerTitle}>
            {wicked ? `😈 ${strings.game.wicked}` : `🎯 ${strings.modes.classic.title}`} — {strings.game.online}
          </Text>
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

  // ── Creating / joining ──────────────────────────────
  if (phase === 'creating') {
    return (
      <View style={styles.waitScreen}>
        <Text style={styles.waitTitle}>{strings.guess.roomReady}</Text>
        <View style={styles.codeCard}>
          <Text style={styles.codeKicker}>{strings.game.roomCode}</Text>
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
  if (room.phase === 'catpick' || room.phase === 'lobby') {
    const bothIn = room.players.length === 2;
    const toggle = (g: string) =>
      setSelCats((s) => (s.includes(g) ? s.filter((x) => x !== g) : s.length < 6 ? [...s, g] : s));

    return (
      <View style={styles.lobbyScreen}>
        <View style={styles.headerRow}>
          <BackBtn onPress={() => setPhase('menu')} />
          <Text style={styles.headerTitle}>
            {wicked ? `😈 ${strings.game.wicked}` : `🎯 ${strings.modes.classic.title}`} — {strings.game.online}
          </Text>
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
                  <Text style={[styles.playerName, p.seat === 0 && styles.playerNameMe]}>
                    {p.name} {p.seat === mySeat ? `(${strings.guess.you})` : ''}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={styles.catTitle}>{strings.game.selectCategories} (2–6):</Text>
            <ScrollView contentContainerStyle={styles.catGrid}>
              {playableGroups.map((g) => {
                const sel = selCats.includes(g);
                return (
                  <Pressable
                    key={g}
                    style={[styles.catCell, sel && styles.catCellSelected]}
                    onPress={() => toggle(g)}
                  >
                    <Text style={[styles.catCellLabel, sel && styles.catCellLabelSelected]} numberOfLines={2}>
                      {g}
                    </Text>
                    {sel ? (
                      <View style={styles.catCheck}>
                        <Text style={styles.catCheckLabel}>✓</Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            {selCats.length >= 2 ? (
              <View style={styles.dock}>
                <Pressable style={styles.dockBtn} onPress={startGame}>
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

  // ── Game ────────────────────────────────────────────
  if (room.phase === 'game') {
    const myTurn = room.activeSeat === mySeat;

    if (!questionsReady) {
      return (
        <View style={styles.loadingScreen}>
          <View style={styles.spinner} />
          <Text style={styles.loadingLabel}>{strings.game.loadingQuestions}</Text>
        </View>
      );
    }

    return (
      <View style={styles.gameScreen}>
        <ScoreBar
          entries={[
            {
              key: '0',
              name: `${p0?.name || strings.game.player1}${p0?.seat === mySeat ? ` (${strings.guess.you})` : ''}`,
              points: room.scores[0],
              side: 0,
              active: room.activeSeat === 0,
              answering: false,
            },
            {
              key: '1',
              name: `${p1?.name || strings.game.player2}${p1?.seat === mySeat ? ` (${strings.guess.you})` : ''}`,
              points: room.scores[1],
              side: 1,
              active: room.activeSeat === 1,
              answering: false,
            },
          ]}
          center={<TurnLabel name={(room.activeSeat === 0 ? p0?.name : p1?.name) || ''} />}
        />

        {!room.current ? (
          <ScrollView contentContainerStyle={styles.boardContent}>
            <View style={styles.categoryRow}>
              {room.cats.map((g) => (
                <View key={g} style={styles.categoryCell}>
                  <Text style={styles.categoryLabel} numberOfLines={2}>
                    {g}
                  </Text>
                </View>
              ))}
            </View>
            {TIERS.map((tier) => (
              <View key={tier} style={styles.tierRow}>
                {room.cats.map((g) => {
                  const key = g + '_' + tier;
                  const used = room.usedCells.includes(key);
                  return (
                    <Pressable
                      key={key}
                      style={[styles.boardCell, used && styles.boardCellUsed, !myTurn && !used && styles.boardCellBlocked]}
                      onPress={() => !used && myTurn && pickCell(g, tier)}
                      disabled={used || !myTurn}
                    >
                      <Text style={styles.boardCellText}>{used ? '' : tier}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.questionRow}>
            <View style={styles.questionMain}>
              <QuestionPanel
                group={room.current.group}
                points={room.current.tier}
                question={room.current.q.question}
              />
              {isHost && room.showAnswer ? (
                <View style={styles.judgeRow}>
                  <Pressable style={styles.judgeYes} onPress={() => markResult(true)}>
                    <Text style={styles.judgeYesLabel}>✓ {strings.game.correct}</Text>
                  </Pressable>
                  <Pressable style={styles.judgeNo} onPress={() => markResult(false)}>
                    <Text style={styles.judgeNoLabel}>✗ {strings.game.wrong}</Text>
                  </Pressable>
                </View>
              ) : isHost ? (
                <Pressable style={styles.revealBtn} onPress={revealAnswer}>
                  <Text style={styles.revealBtnLabel}>👁 {strings.game.revealAnswer}</Text>
                </Pressable>
              ) : !room.showAnswer ? (
                <Text style={styles.waitJudge}>{strings.guess.waitingHostConfirm}</Text>
              ) : null}
            </View>
            <View style={styles.timerColumn}>
              {room.showAnswer ? (
                <View style={styles.answerBox}>
                  <Text style={styles.answerKicker}>{strings.game.answer}</Text>
                  <Text style={styles.answerText}>{room.current.q.answer}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}
      </View>
    );
  }

  // ── Result ──────────────────────────────────────────
  if (room.phase === 'result') {
    const winner = room.scores[0] > room.scores[1] ? 0 : room.scores[1] > room.scores[0] ? 1 : -1;
    const myWin = winner === mySeat;
    return (
      <View style={styles.resultScreen}>
        <Text style={styles.resultEmoji}>{winner === -1 ? '🤝' : myWin ? '🏆' : '💥'}</Text>
        <Text style={[styles.resultTitle, winner === -1 ? styles.resultTie : myWin ? styles.resultWin : styles.resultLose]}>
          {winner === -1 ? strings.end.tie : myWin ? strings.guess.youWon : `${p0?.name ?? ''} / ${p1?.name ?? ''}`}
        </Text>
        <View style={styles.resultScores}>
          {room.players.map((p) => (
            <View key={p.seat} style={[styles.resultScoreCell, p.seat === winner && styles.resultScoreCellWin]}>
              <Text style={[styles.resultScoreName, p.seat === winner && styles.resultScoreNameWin]}>{p.name}</Text>
              <Text style={[styles.resultScoreValue, p.seat === winner && styles.resultScoreValueWin]}>
                {room.scores[p.seat]}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.resultButtons}>
          {isHost ? (
            <Pressable
              style={styles.resultPrimary}
              onPress={() => {
                setSelCats([]);
                sync({ phase: 'catpick', cats: [], usedCells: [], current: null, showAnswer: false, activeSeat: 0, scores: [0, 0] });
                setQuestionsReady(false);
              }}
            >
              <Text style={styles.resultPrimaryLabel}>{strings.game.playAgain} ↺</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={styles.ghostBtn}
            onPress={() => onEnd([room.scores[0], room.scores[1]], [p0?.name ?? '', p1?.name ?? ''])}
          >
            <Text style={styles.ghostBtnLabel}>{strings.game.menu}</Text>
          </Pressable>
        </View>
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
  },
  catCell: {
    flexBasis: '18%',
    minHeight: 64,
    backgroundColor: colors.cyan,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  catCellSelected: {
    backgroundColor: colors.navy,
    borderColor: colors.cyan,
  },
  catCellLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.navy,
    textAlign: 'center',
  },
  catCellLabelSelected: {
    color: colors.cyan,
  },
  catCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catCheckLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.navy,
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
  gameScreen: {
    flex: 1,
    backgroundColor: colors.background,
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
    opacity: 0.6,
  },
  boardCellBlocked: {
    opacity: 0.5,
  },
  boardCellText: {
    fontFamily: fontFamily.black,
    fontSize: 18,
    color: colors.navy,
  },
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
  judgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  judgeYes: {
    backgroundColor: colors.green,
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  judgeYesLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.navy,
  },
  judgeNo: {
    backgroundColor: colors.pink,
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  judgeNoLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.offWhite,
  },
  revealBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  revealBtnLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.offWhite,
  },
  waitJudge: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: 'rgba(0,27,135,.5)',
  },
  timerColumn: {
    width: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerBox: {
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  answerKicker: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: colors.cyan,
    letterSpacing: 1,
  },
  answerText: {
    fontFamily: fontFamily.black,
    fontSize: 16,
    color: colors.green,
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
    fontSize: 30,
    textAlign: 'center',
  },
  resultTie: {
    color: colors.cyan,
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
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: 28,
  },
  resultScoreCellWin: {
    backgroundColor: colors.cyan,
  },
  resultScoreName: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.cyan,
  },
  resultScoreNameWin: {
    color: colors.navy,
  },
  resultScoreValue: {
    fontFamily: fontFamily.black,
    fontSize: 36,
    color: colors.offWhite,
  },
  resultScoreValueWin: {
    color: colors.navy,
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
