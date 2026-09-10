import { useCallback, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RewardsProvider, useRewards } from '../../src/games/rewards';
import { ModeSelectScreen } from '../../src/games/ModeSelectScreen';
import { PlayersScreen } from '../../src/games/PlayersScreen';
import { CategoriesScreen } from '../../src/games/CategoriesScreen';
import { ClassicGameScreen } from '../../src/games/ClassicGameScreen';
import { ThirtyGameScreen } from '../../src/games/ThirtyGameScreen';
import { SoloGameScreen } from '../../src/games/SoloGameScreen';
import { GuessGameScreen } from '../../src/games/GuessGameScreen';
import { OnlineClassicGameScreen } from '../../src/games/OnlineClassicGameScreen';
import { OnlineThirtyGameScreen } from '../../src/games/OnlineThirtyGameScreen';
import { ResultScreen } from '../../src/components/ResultScreen';
import type { StandingRow } from '../../src/components/ResultScreen';
import { formatRecordTime, saveRecord } from '../../src/lib/records';
import { strings } from '../../src/i18n';
import type { GameMode } from '../../src/types';

type Step = 'mode' | 'players' | 'categories' | 'game' | 'end';

/** Record label per board mode, mirroring the web build's MODE_LABELS keys. */
const RECORD_KEYS: Partial<Record<GameMode, string>> = {
  teams: 'classicTeams',
  ffa: 'classicFfa',
  teamsHost: 'classicTeamsHost',
  wickedTeams: 'wickedTeams',
  wickedFfa: 'wickedFfa',
  wickedTeamsHost: 'wickedTeamsHost',
};

function PlayRoute() {
  const router = useRouter();
  const { mode, online } = useLocalSearchParams<{ mode?: string; online?: string }>();
  const { rewardGameEnd } = useRewards();

  const wicked = mode === 'wicked';
  const boardMode = mode === 'classic' || mode === 'wicked';
  const isOnline = online === '1' && boardMode;

  const [step, setStep] = useState<Step>('mode');
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [players, setPlayers] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [session, setSession] = useState(0);
  const [end, setEnd] = useState<{ standings: StandingRow[]; isTie: boolean; winnerName: string; topPoints: number; coinsEarned: number } | null>(null);

  const goHome = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  /** Shared finish path: record + rewards, then the standings screen. */
  const finishMatch = useCallback(
    async (entries: [string, number][], labelKey: string | undefined) => {
      const sorted = [...entries].sort((a, b) => b[1] - a[1]);
      const standings: StandingRow[] = sorted.map(([name, points]) => ({ name, points }));
      const isTie = sorted.length > 1 && sorted[0]![1] === sorted[1]![1];
      const top = sorted[0];
      const winnerName = isTie ? strings.end.tie : (top?.[0] ?? '');
      const topPoints = top?.[1] ?? 0;
      const { coinsEarned } = await rewardGameEnd(sorted);
      void saveRecord({
        id: Date.now().toString(),
        mode: labelKey ?? gameMode ?? 'teams',
        scores: sorted.map(([name, pts]) => ({ name, pts })),
        time: formatRecordTime(),
      });
      setEnd({ standings, isTie, winnerName, topPoints, coinsEarned });
      setStep('end');
    },
    [gameMode, rewardGameEnd],
  );

  const handleClassicEnd = useCallback(
    (scores: Record<string, number>, names: Record<string, string>) => {
      const entries: [string, number][] = Object.entries(scores).map(([k, v]) => [names[k] ?? k, v]);
      void finishMatch(entries, gameMode ? RECORD_KEYS[gameMode] : undefined);
    },
    [finishMatch, gameMode],
  );

  const handlePairEnd = useCallback(
    (scores: [number, number], names: [string, string]) => {
      const entries: [string, number][] = names.map((name, i) => [name, scores[i] ?? 0] as [string, number]);
      void finishMatch(entries, mode === 'thirty' ? 'thirty' : undefined);
    },
    [finishMatch, mode],
  );

  /** Online screens show their own result; onEnd only remounts the screen
   *  back to its menu (the web build awards no records/rewards for online
   *  matches — parity kept). */
  const handleOnlineEnd = useCallback(
    (_scores: [number, number], _names: [string, string]) => {
      setSession((s) => s + 1);
    },
    [],
  );

  if (mode === 'solo') return <SoloGameScreen onBack={goHome} />;
  if (mode === 'guess') return <GuessGameScreen onEnd={handleOnlineEnd} onBack={goHome} />;
  if (mode === 'thirty' && isOnline) return <OnlineThirtyGameScreen onEnd={handleOnlineEnd} onBack={goHome} />;
  if (boardMode && isOnline)
    return (
      <OnlineClassicGameScreen
        key={session}
        wicked={wicked}
        onEnd={handleOnlineEnd}
        onBack={goHome}
      />
    );

  // Local flows -----------------------------------------------
  if (mode === 'thirty') {
    if (end) {
      return (
        <ResultScreen
          standings={end.standings}
          isTie={end.isTie}
          winnerName={end.winnerName}
          topPoints={end.topPoints}
          coinsEarned={end.coinsEarned}
          ctaLabel={strings.game.playAgain}
          onCta={() => {
            setEnd(null);
            setSession((s) => s + 1);
          }}
        />
      );
    }
    return <ThirtyGameScreen key={session} onEnd={handlePairEnd} onBack={goHome} />;
  }

  if (boardMode) {
    if (step === 'mode')
      return (
        <ModeSelectScreen
          wicked={wicked}
          onSelect={(m) => {
            setGameMode(m);
            setStep('players');
          }}
          onBack={goHome}
        />
      );
    if (step === 'players' && gameMode)
      return (
        <PlayersScreen
          mode={gameMode}
          onConfirm={(p) => {
            setPlayers(p);
            setStep('categories');
          }}
          onBack={() => setStep('mode')}
        />
      );
    if (step === 'categories')
      return (
        <CategoriesScreen
          onConfirm={(g) => {
            setGroups(g);
            setStep('game');
          }}
          onBack={() => setStep('players')}
        />
      );
    if (step === 'end' && end)
      return (
        <ResultScreen
          standings={end.standings}
          isTie={end.isTie}
          winnerName={end.winnerName}
          topPoints={end.topPoints}
          coinsEarned={end.coinsEarned}
          ctaLabel={strings.game.playAgain}
          onCta={() => {
            setEnd(null);
            setStep('game');
            setSession((s) => s + 1);
          }}
        />
      );
    if (gameMode && players.length > 0 && groups.length > 0)
      return (
        <ClassicGameScreen
          key={session}
          mode={gameMode}
          players={players}
          groups={groups}
          onEnd={handleClassicEnd}
          onBack={() => setStep('categories')}
        />
      );
  }

  return null;
}

export default function PlayScreen() {
  return (
    <RewardsProvider>
      <PlayRoute />
    </RewardsProvider>
  );
}
