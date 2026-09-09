import { InviteNotification } from './components/InviteNotification';
import { MODE_LABELS, saveRecord } from './components/RecordsOverlay';
import { AccountCtx, AccountProvider } from './contexts/AccountContext';
import { AudioProvider } from './contexts/AudioContext';
import { CoinsCtx, CoinsProvider } from './contexts/CoinsContext';
import { NavCtx } from './contexts/NavContext';
import { SubCtx, SubProvider } from './contexts/SubContext';
import { GuessSetupStub } from './games/GuessSetupStub';
import { SoloGame, getGameStreak, setGameStreak } from './games/SoloGame';
import { ThirtySetupStub } from './games/ThirtySetupStub';
import { XP_PER_GAME, getLocalXp, setLocalXp, xpToLevel } from './lib/xp';
import { OnlineClassicGame } from './online/OnlineClassicGame';
import { OnlineThirtyGame } from './online/OnlineThirtyGame';
import { CategoriesScreen } from './screens/CategoriesScreen';
import { EndScreen } from './screens/EndScreen';
import { GameScreen } from './screens/GameScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ModeSelectScreen } from './screens/ModeSelectScreen';
import { PlayersScreen } from './screens/PlayersScreen';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { StoreScreen } from './store/StoreScreen';
import { syncXpToServer } from './api';
import { subscribeToInvites, updateInviteStatus } from './supabase';
import { useContext, useEffect, useState } from 'react';
import type { Screen } from './screenTypes';
import type { GameInvite } from './supabase';

export function AppInner() {
  const { addCoins, flushCoins } = useContext(CoinsCtx);
  const { account, patchAccount } = useContext(AccountCtx);
  const { tier, matchCount, incMatchCount } = useContext(SubCtx);
  const [screen, setScreen] = useState<Exclude<Screen, { id: 'welcome' }>>({ id: 'home' });
  const [showWelcome, setShowWelcome] = useState(true);
  const [pendingInvite, setPendingInvite] = useState<GameInvite | null>(null);

  // listen for incoming game invites via Supabase Realtime
  useEffect(() => {
    if (!account?.id || !account.emailVerified) return;
    const unsub = subscribeToInvites(account.id, (inv) => setPendingInvite(inv));
    return unsub;
  }, [account?.id, account?.emailVerified]);

  const handleAcceptInvite = async () => {
    if (!pendingInvite) return;
    await updateInviteStatus(pendingInvite.id, 'accepted');
    const inv = pendingInvite;
    setPendingInvite(null);
    const code = inv.room_code;
    if (inv.mode === 'classic') go({ id: 'onlineClassic', wicked: false, autoJoinCode: code });
    else if (inv.mode === 'wicked') go({ id: 'onlineClassic', wicked: true, autoJoinCode: code });
    else if (inv.mode === 'thirty') go({ id: 'onlineThirty', autoJoinCode: code });
    else if (inv.mode === 'guess') go({ id: 'guessSetup', autoJoinCode: code });
  };

  const handleDeclineInvite = async () => {
    if (!pendingInvite) return;
    await updateInviteStatus(pendingInvite.id, 'declined');
    setPendingInvite(null);
  };

  const go = (s: Screen) => { if (s.id !== 'welcome') setScreen(s); };

  const rewardGameEnd = (sc: Record<string, number>): number => {
    let earned = 100;
    const sortedKeys = Object.keys(sc).sort((a, b) => sc[b] - sc[a]);
    const isTie = sortedKeys.length > 1 && sc[sortedKeys[0]] === sc[sortedKeys[1]];
    if (!isTie) earned += 50;
    const streak = getGameStreak() + 1;
    setGameStreak(streak);
    if (streak % 3 === 0) earned += 100;

    // Subscription bonuses
    const newMatchCount = matchCount + 1;
    incMatchCount();
    if (tier === 'starter' && Math.random() < 0.05) earned *= 2; // 5% double coins
    if (tier === 'supporter' && newMatchCount % 3 === 0) earned += 250;
    if (tier === 'advocate' && newMatchCount % 3 === 0) earned += 1000;

    addCoins(Math.floor(earned));
    setTimeout(flushCoins, 100);

    // Award XP (local first for instant feedback, then sync to server)
    const oldXp = getLocalXp();
    const newXp = oldXp + XP_PER_GAME;
    setLocalXp(newXp);
    const newLevel = xpToLevel(newXp);
    patchAccount({ xp: newXp, level: newLevel });
    syncXpToServer(XP_PER_GAME, tier !== 'free' ? tier : undefined).catch(() => {});

    return Math.floor(earned);
  };

  const renderScreen = () => {
    if (screen.id === 'home') return <HomeScreen onNav={go} />;
    if (screen.id === 'modeSelect') return <ModeSelectScreen wicked={screen.wicked} onSelect={m => go({ id: 'players', mode: m })} onBack={() => go({ id: 'home' })} />;
    if (screen.id === 'players') return <PlayersScreen mode={screen.mode} onConfirm={p => go({ id: 'categories', mode: screen.mode, players: p })} onBack={() => go({ id: 'modeSelect', wicked: screen.mode.includes('wicked') })} />;
    if (screen.id === 'categories') return <CategoriesScreen mode={screen.mode} players={screen.players} onConfirm={g => go({ id: 'game', mode: screen.mode, players: screen.players, groups: g })} onBack={() => go({ id: 'players', mode: screen.mode })} />;
    if (screen.id === 'game') return <GameScreen mode={screen.mode} players={screen.players} groups={screen.groups} onEnd={(sc, nm) => {
      const coinsEarned = rewardGameEnd(sc);
      saveRecord({ id: Date.now().toString(), mode: MODE_LABELS[screen.mode] || screen.mode, scores: Object.entries(sc).map(([k, v]) => ({ name: nm[k], pts: v })), time: new Date().toLocaleString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) });
      go({ id: 'end', scores: sc, names: nm, coinsEarned });
    }} onBack={() => go({ id: 'categories', mode: screen.mode, players: screen.players })} />;
    if (screen.id === 'end') return <EndScreen scores={screen.scores} names={screen.names} coinsEarned={screen.coinsEarned} onRestart={() => go({ id: 'home' })} />;
    if (screen.id === 'thirtySetup') return <ThirtySetupStub onBack={() => go({ id: 'home' })} />;
    if (screen.id === 'guessSetup') return <GuessSetupStub onBack={() => go({ id: 'home' })} autoJoinCode={screen.autoJoinCode} hostCode={screen.hostCode} />;
    if (screen.id === 'onlineClassic') return <OnlineClassicGame wicked={screen.wicked} onBack={() => go({ id: 'home' })} autoJoinCode={screen.autoJoinCode} hostCode={screen.hostCode} />;
    if (screen.id === 'onlineThirty') return <OnlineThirtyGame onBack={() => go({ id: 'home' })} autoJoinCode={screen.autoJoinCode} hostCode={screen.hostCode} />;
    if (screen.id === 'solo') return <SoloGame onBack={() => go({ id: 'home' })} />;
    if (screen.id === 'store') return <StoreScreen onBack={() => go({ id: 'home' })} />;
    return null;
  };

  return (
    <NavCtx.Provider value={{ goHome: () => go({ id: 'home' }), goTo: go }}>
      {renderScreen()}
      {showWelcome && <WelcomeScreen onDone={() => setShowWelcome(false)} />}
      {pendingInvite && <InviteNotification invite={pendingInvite} onAccept={handleAcceptInvite} onDecline={handleDeclineInvite} />}
    </NavCtx.Provider>
  );
}

export default function App() {
  return (
    <div className="app">
      <AudioProvider>
        <AccountProvider>
          <CoinsProvider>
            <SubProvider>
              <AppInner />
            </SubProvider>
          </CoinsProvider>
        </AccountProvider>
      </AudioProvider>
    </div>
  );
}
