import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, radii, spacing } from '../theme/tokens';
import { fill, strings } from '../i18n';
import type { GameInvite } from '../lib/profiles';

/** Same labels as the web build's MODE_LABELS_AR. */
const MODE_LABELS: Record<GameInvite['mode'], string> = {
  classic: strings.challenge.modeClassic,
  wicked: strings.challenge.modeWicked,
  thirty: strings.challenge.modeThirty,
  guess: strings.challenge.modeGuess,
};

/**
 * Incoming game-invite banner — the native twin of the web build's
 * InviteNotification: navy card pinned near the bottom with the challenger
 * name, mode and room code, plus join / decline actions.
 */
export function InviteNotification({
  invite,
  onAccept,
  onDecline,
}: {
  invite: GameInvite;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <View style={styles.banner} pointerEvents="box-none">
      <View style={styles.card}>
        <View style={styles.head}>
          <Text style={styles.icon}>⚔️</Text>
          <View style={styles.headText}>
            <Text style={styles.title}>{fill(strings.invite.from, { name: invite.from_name })}</Text>
            <Text style={styles.sub}>
              {MODE_LABELS[invite.mode]} — {strings.invite.code}{' '}
              <Text style={styles.code}>{invite.room_code}</Text>
            </Text>
          </View>
        </View>
        <View style={styles.actions}>
          <Pressable style={styles.joinBtn} onPress={onAccept} accessibilityRole="button">
            <Text style={styles.joinLabel}>{strings.invite.join}</Text>
          </Pressable>
          <Pressable style={styles.declineBtn} onPress={onDecline} accessibilityRole="button">
            <Text style={styles.declineLabel}>{strings.invite.reject}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    zIndex: 500,
    elevation: 40,
    alignItems: 'center',
  },
  card: {
    width: '92%',
    maxWidth: 360,
    backgroundColor: colors.navy,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.cyan,
    shadowColor: colors.cyan,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 12,
    padding: 18,
    paddingHorizontal: 20,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  icon: { fontSize: 30 },
  headText: { flex: 1 },
  title: { fontFamily: fontFamily.black, fontSize: 15, color: colors.offWhite, marginBottom: 4 },
  sub: { fontFamily: fontFamily.regular, fontSize: 13, color: 'rgba(255,255,255,.55)' },
  code: {
    color: colors.cyan,
    fontWeight: '800',
    letterSpacing: 3,
  },
  actions: { flexDirection: 'row', gap: spacing.md },
  joinBtn: {
    flex: 1,
    backgroundColor: colors.cyan,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: colors.navy,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 0,
    elevation: 4,
  },
  joinLabel: { fontFamily: fontFamily.black, fontSize: 15, color: colors.navy },
  declineBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.15)',
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  declineLabel: { fontFamily: fontFamily.bold, fontSize: 15, color: 'rgba(255,255,255,.5)' },
});
