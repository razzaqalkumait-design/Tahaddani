import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAccount } from '../contexts/AccountContext';
import { subscribeToInvites, updateInviteStatus } from '../lib/profiles';
import type { GameInvite } from '../lib/profiles';
import { InviteNotification } from './InviteNotification';

/**
 * Root invite listener — the native twin of the web build's App-level
 * invite wiring: a Realtime subscription on game_invites for the signed-in
 * user, showing the banner on any screen. Accept routes to the matching
 * online game with the room code (auto-join); decline marks it declined.
 */
export function InviteListener() {
  const router = useRouter();
  const { account } = useAccount();
  const [pendingInvite, setPendingInvite] = useState<GameInvite | null>(null);

  useEffect(() => {
    if (!account?.id) return;
    return subscribeToInvites(account.id, setPendingInvite);
  }, [account?.id]);

  const handleAccept = async () => {
    if (!pendingInvite) return;
    await updateInviteStatus(pendingInvite.id, 'accepted');
    const invite = pendingInvite;
    setPendingInvite(null);
    const code = invite.room_code;
    if (invite.mode === 'classic') router.push('/play/classic?online=1&join=' + code);
    else if (invite.mode === 'wicked') router.push('/play/wicked?online=1&join=' + code);
    else if (invite.mode === 'thirty') router.push('/play/thirty?online=1&join=' + code);
    else if (invite.mode === 'guess') router.push('/play/guess?join=' + code);
  };

  const handleDecline = async () => {
    if (!pendingInvite) return;
    await updateInviteStatus(pendingInvite.id, 'declined');
    setPendingInvite(null);
  };

  if (!pendingInvite) return null;

  return <InviteNotification invite={pendingInvite} onAccept={() => void handleAccept()} onDecline={() => void handleDecline()} />;
}
