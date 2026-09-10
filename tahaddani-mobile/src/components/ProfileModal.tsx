import { useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { AVATAR_FALLBACKS, useAccount } from '../contexts/AccountContext';
import { useCoins } from '../contexts/CoinsContext';
import { AvatarGlyph } from './AvatarGlyph';
import { colors, fontFamily, spacing } from '../theme/tokens';
import { fill, strings } from '../i18n';
import { logger } from '../lib/logger';
import {
  acceptFriendRequest,
  cacheProfile,
  getFriends,
  getFriendshipStatus,
  isUsernameTaken,
  removeFriend,
  searchByUsername,
  sendFriendRequest,
  sendGameInvite,
  updateProfile,
  uploadAvatar,
} from '../lib/profiles';
import type { FriendEntry, InviteMode, Profile } from '../lib/profiles';
import { validateDisplayName, validateUsername } from '../utils/profanity';

type UsernameStatus = 'idle' | 'checking' | 'ok' | 'taken' | 'invalid';

interface UploadFile {
  name: string;
  type: string;
  base64: string;
}

/**
 * Profile + friends modal — the native twin of the web build's ProfileModal.
 * Profile tab: avatar picker (photo upload or preset grid), display name,
 * username (locked once set), save + logout. Friends tab: search by
 * username, friend requests, and game challenges sent through game_invites.
 */
export function ProfileModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const { account, logout, patchAccount } = useAccount();
  const { coins } = useCoins();
  const [tab, setTab] = useState<'profile' | 'friends'>('profile');

  // ── Edit profile state (web ProfileModal) ──
  const [editAvatar, setEditAvatar] = useState(false);
  const [avatarIdx, setAvatarIdx] = useState(() => {
    const n = Number(account?.avatar);
    return Number.isNaN(n) ? 0 : n;
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUpload, setAvatarUpload] = useState<UploadFile | null>(null);
  const [displayName, setDisplayName] = useState(account?.name ?? '');
  const [username, setUsername] = useState(account?.username ?? '');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const usernameAlreadySet = Boolean(account?.username);

  // ── Friends state (web ProfileModal) ──
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [friendStatus, setFriendStatus] = useState<Record<string, { id: string; status: string; direction: string } | null>>({});
  const [challengeTarget, setChallengeTarget] = useState<FriendEntry | null>(null);
  const [inviteSending, setInviteSending] = useState(false);

  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!account?.id) return;
    void getFriends(account.id).then(setFriends);
  }, [account?.id]);

  const checkUsername = (val: string) => {
    setUsername(val);
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    const clean = val.toLowerCase().trim();
    if (!clean) {
      setUsernameStatus('idle');
      return;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
      setUsernameStatus('invalid');
      return;
    }
    if (validateUsername(clean)) {
      setUsernameStatus('invalid');
      return;
    }
    if (clean === account?.username) {
      setUsernameStatus('ok');
      return;
    }
    setUsernameStatus('checking');
    usernameTimer.current = setTimeout(() => {
      void isUsernameTaken(clean, account?.id).then((taken) => setUsernameStatus(taken ? 'taken' : 'ok'));
    }, 500);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });
    const asset = result.assets?.[0];
    if (!asset) return;
    setAvatarPreview(asset.uri);
    setAvatarUpload({
      name: asset.fileName ?? 'avatar.jpg',
      type: asset.mimeType ?? 'image/jpeg',
      base64: asset.base64 ?? '',
    });
  };

  const saveProfile = async () => {
    if (!account?.id) return;
    if (displayName.trim().length >= 2) {
      const nameErr = validateDisplayName(displayName.trim());
      if (nameErr) {
        setSaveMsg(nameErr);
        return;
      }
    }
    setSaving(true);
    setSaveMsg('');
    const fields: Record<string, string> = {};
    if (avatarUpload) {
      const result = await uploadAvatar(account.id, avatarUpload);
      if (result.url) {
        fields.avatar = result.url;
      } else {
        setSaving(false);
        setSaveMsg(strings.profile.uploadFailed + result.error);
        return;
      }
    } else {
      fields.avatar = String(avatarIdx);
    }
    if (displayName.trim().length >= 2) fields.name = displayName.trim();
    if (!usernameAlreadySet) {
      const cleanUsername = username.toLowerCase().trim();
      if (cleanUsername && usernameStatus === 'ok') fields.username = cleanUsername;
    }
    // Keep email in sync for username-based login lookup.
    if (account.email) fields.email = account.email;
    const err = await updateProfile(fields);
    setSaving(false);
    if (err) {
      setSaveMsg(strings.profile.errorPrefix + err);
      logger.error('[saveProfile]', err, { fields });
      return;
    }
    // Update local state directly — don't re-fetch from DB.
    const patched = {
      name: fields.name ?? account.name,
      avatar: fields.avatar ?? account.avatar,
      username: fields.username ?? account.username,
    };
    patchAccount(patched);
    void cacheProfile({ id: account.id, name: patched.name, username: patched.username ?? '', avatar: patched.avatar });
    setSaveMsg(strings.profile.saved);
    setEditAvatar(false);
    setAvatarUpload(null);
    setAvatarPreview(null);
    setTimeout(() => setSaveMsg(''), 2000);
  };

  const doSearch = async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    const results = await searchByUsername(searchQ.trim());
    const filtered = results.filter((p) => p.id !== account?.id);
    setSearchResults(filtered);
    if (account?.id) {
      const statuses: Record<string, { id: string; status: string; direction: string } | null> = {};
      await Promise.all(
        filtered.map(async (p) => {
          statuses[p.id] = await getFriendshipStatus(account.id!, p.id);
        }),
      );
      setFriendStatus(statuses);
    }
    setSearching(false);
  };

  const sendRequest = async (addresseeId: string) => {
    if (!account?.id) return;
    await sendFriendRequest(account.id, addresseeId);
    setFriendStatus((s) => ({ ...s, [addresseeId]: { id: '', status: 'pending', direction: 'sent' } }));
    void getFriends(account.id).then(setFriends);
  };

  const accept = async (entry: FriendEntry) => {
    await acceptFriendRequest(entry.id);
    if (account?.id) void getFriends(account.id).then(setFriends);
  };

  const remove = async (entry: FriendEntry) => {
    await removeFriend(entry.id);
    if (account?.id) void getFriends(account.id).then(setFriends);
  };

  const sendChallenge = async (mode: InviteMode) => {
    if (!account?.id || !challengeTarget) return;
    setInviteSending(true);
    const code = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.split('').sort(() => Math.random() - 0.5).slice(0, 6).join('');
    await sendGameInvite(account.id, challengeTarget.profile.id, account.name, mode, code);
    setInviteSending(false);
    onClose();
    if (mode === 'classic') router.push('/play/classic?online=1&host=' + code);
    else if (mode === 'wicked') router.push('/play/wicked?online=1&host=' + code);
    else if (mode === 'thirty') router.push('/play/thirty?online=1&host=' + code);
    else router.push('/play/guess?host=' + code);
  };

  const pendingIn = friends.filter((f) => f.status === 'pending' && f.direction === 'received');
  const accepted = friends.filter((f) => f.status === 'accepted');
  const sentPending = friends.filter((f) => f.status === 'pending' && f.direction === 'sent');

  const avatarGlyphAvatar = editAvatar && avatarPreview ? avatarPreview : editAvatar ? String(avatarIdx) : (account?.avatar ?? '0');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} supportedOrientations={['landscape', 'landscape-left', 'landscape-right']}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel={strings.common.close}>
        {/* Challenge mode picker (web ProfileModal) */}
        {challengeTarget ? (
          <Pressable style={styles.challengeOverlay} onPress={() => setChallengeTarget(null)}>
            <Pressable style={styles.challengeCard} onPress={() => {}}>
              <Text style={styles.challengeTitle}>{fill(strings.challenge.title, { name: challengeTarget.profile.name })}</Text>
              <Text style={styles.challengeSub}>{strings.challenge.pickMode}</Text>
              <View style={styles.challengeModes}>
                {(
                  [
                    ['classic', strings.challenge.modeClassic],
                    ['wicked', strings.challenge.modeWicked],
                    ['thirty', strings.challenge.modeThirty],
                    ['guess', strings.challenge.modeGuess],
                  ] as [InviteMode, string][]
                ).map(([m, label]) => (
                  <Pressable key={m} style={styles.challengeModeBtn} onPress={() => void sendChallenge(m)} disabled={inviteSending}>
                    <Text style={styles.challengeModeLabel}>{inviteSending ? '...' : label}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable style={styles.challengeCancel} onPress={() => setChallengeTarget(null)}>
                <Text style={styles.challengeCancelLabel}>{strings.game.cancel}</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        ) : null}

        {/* Catches taps so they never reach the dismissing backdrop below. */}
        <Pressable style={styles.card} onPress={() => {}}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIdentity}>
              <View style={styles.headerAvatar}>
                <AvatarGlyph avatar={avatarGlyphAvatar} size={52} />
                <Pressable style={styles.editAvatarBtn} onPress={() => setEditAvatar((v) => !v)}>
                  <Text style={styles.editAvatarGlyph}>✏️</Text>
                </Pressable>
              </View>
              <View>
                <Text style={styles.headerName}>{account?.name}</Text>
                {account?.username ? <Text style={styles.headerUsername}>@{account.username}</Text> : null}
                <View style={styles.headerCoins}>
                  <Text style={styles.headerCoinsValue}>{coins.toLocaleString('en-US')}</Text>
                  <Text style={styles.headerCoinsIcon}>🪙</Text>
                </View>
              </View>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel={strings.common.close}>
              <Text style={styles.closeLabel}>✕</Text>
            </Pressable>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            {(['profile', 'friends'] as const).map((t) => (
              <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
                <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
                  {t === 'profile' ? strings.profile.tabProfile : strings.profile.tabFriends}
                </Text>
                {t === 'friends' && pendingIn.length > 0 ? <View style={styles.tabDot} /> : null}
              </Pressable>
            ))}
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            {tab === 'profile' ? (
              <View style={styles.profileBody}>
                {editAvatar ? (
                  <View style={styles.avatarPicker}>
                    <Text style={styles.pickerLabel}>
                      {strings.profile.avatarLabel} <Text style={styles.pickerHint}>{strings.profile.avatarHint}</Text>
                    </Text>
                    <View style={styles.avatarPickerRow}>
                      <Pressable style={[styles.uploadBtn, avatarPreview && styles.uploadBtnActive]} onPress={() => void pickImage()}>
                        {avatarPreview ? (
                          <Image source={{ uri: avatarPreview }} style={styles.uploadPreview} />
                        ) : (
                          <Text style={styles.uploadGlyph}>📷</Text>
                        )}
                      </Pressable>
                      {AVATAR_FALLBACKS.map((glyph, i) => (
                        <Pressable
                          key={i}
                          style={[styles.avatarCell, !avatarPreview && avatarIdx === i && styles.avatarCellActive]}
                          onPress={() => {
                            setAvatarIdx(i);
                            setAvatarPreview(null);
                            setAvatarUpload(null);
                          }}
                        >
                          <Text style={styles.avatarGlyph}>{glyph}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}

                {/* Display name */}
                <View>
                  <Text style={styles.fieldLabel}>
                    {strings.profile.displayName} <Text style={styles.pickerHint}>{strings.profile.displayNameHint}</Text>
                  </Text>
                  <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    maxLength={20}
                    style={styles.fieldInput}
                    placeholder={strings.game.enterName}
                    placeholderTextColor="rgba(255,255,255,.35)"
                  />
                </View>

                {/* Username */}
                <View>
                  <Text style={styles.fieldLabel}>
                    {strings.profile.usernameLabel} <Text style={styles.pickerHint}>{strings.profile.usernameHint}</Text>
                    {usernameAlreadySet ? <Text style={styles.usernameLocked}>{strings.profile.usernameLocked}</Text> : null}
                  </Text>
                  <View style={styles.usernameRow}>
                    <Text style={styles.usernameAt}>@</Text>
                    <TextInput
                      value={username}
                      onChangeText={(t) => {
                        if (!usernameAlreadySet) checkUsername(t);
                      }}
                      maxLength={20}
                      placeholder="a-z 0-9 _"
                      placeholderTextColor="rgba(255,255,255,.35)"
                      editable={!usernameAlreadySet}
                      style={[styles.usernameInput, usernameAlreadySet && styles.usernameInputLocked]}
                    />
                    {!usernameAlreadySet && usernameStatus === 'checking' ? <Text style={styles.usernameStatus}>⏳</Text> : null}
                    {!usernameAlreadySet && usernameStatus === 'ok' ? <Text style={[styles.usernameStatus, styles.usernameStatusOk]}>✓</Text> : null}
                    {!usernameAlreadySet && usernameStatus === 'taken' ? <Text style={[styles.usernameStatus, styles.usernameStatusTaken]}>✗</Text> : null}
                  </View>
                  {!usernameAlreadySet && usernameStatus === 'invalid' ? (
                    <Text style={styles.usernameError}>{strings.profile.usernameRules}</Text>
                  ) : null}
                  {!usernameAlreadySet && usernameStatus === 'taken' ? (
                    <Text style={styles.usernameError}>{strings.profile.usernameTaken}</Text>
                  ) : null}
                </View>

                {saveMsg ? (
                  <Text style={[styles.saveMsg, saveMsg.startsWith('تم') && styles.saveMsgOk]}>{saveMsg}</Text>
                ) : null}

                <Pressable
                  style={[styles.saveBtn, (saving || usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'checking') && styles.saveBtnDisabled]}
                  onPress={() => void saveProfile()}
                  disabled={saving || usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'checking'}
                >
                  <Text style={styles.saveBtnLabel}>{saving ? '...' : strings.profile.save}</Text>
                </Pressable>

                <View style={styles.divider} />
                <Pressable
                  style={styles.logoutBtn}
                  onPress={() => {
                    void logout();
                    onClose();
                  }}
                >
                  <Text style={styles.logoutLabel}>{strings.settings.logout}</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.friendsBody}>
                {/* Search */}
                <View>
                  <Text style={styles.fieldLabel}>{strings.friends.search}</Text>
                  <View style={styles.searchRow}>
                    <TextInput
                      value={searchQ}
                      onChangeText={setSearchQ}
                      onSubmitEditing={() => void doSearch()}
                      placeholder="@username"
                      placeholderTextColor="rgba(255,255,255,.35)"
                      style={[styles.searchInput, { flex: 1 }]}
                    />
                    <Pressable style={styles.searchBtn} onPress={() => void doSearch()} disabled={searching}>
                      <Text style={styles.searchBtnLabel}>{strings.friends.searchBtn}</Text>
                    </Pressable>
                  </View>
                </View>

                {searchResults.length > 0 ? (
                  <View style={styles.list}>
                    {searchResults.map((p) => {
                      const fs = friendStatus[p.id];
                      return (
                        <View key={p.id} style={styles.friendRow}>
                          <AvatarGlyph avatar={p.avatar} size={34} />
                          <View style={styles.friendText}>
                            <Text style={styles.friendName}>{p.name}</Text>
                            <Text style={styles.friendUsername}>@{p.username}</Text>
                          </View>
                          {!fs ? (
                            <Pressable style={styles.addBtn} onPress={() => void sendRequest(p.id)}>
                              <Text style={styles.addBtnLabel}>{strings.friends.add}</Text>
                            </Pressable>
                          ) : null}
                          {fs?.status === 'pending' && fs.direction === 'sent' ? (
                            <Text style={styles.waitingLabel}>{strings.friends.waiting}</Text>
                          ) : null}
                          {fs?.status === 'accepted' ? (
                            <Text style={styles.friendLabel}>{strings.friends.friend}</Text>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                ) : null}

                {/* Incoming requests */}
                {pendingIn.length > 0 ? (
                  <View>
                    <Text style={styles.sectionLabel}>
                      {strings.friends.incoming} ({pendingIn.length})
                    </Text>
                    <View style={styles.list}>
                      {pendingIn.map((entry) => (
                        <View key={entry.id} style={styles.friendRow}>
                          <AvatarGlyph avatar={entry.profile.avatar} size={34} />
                          <View style={styles.friendText}>
                            <Text style={styles.friendName}>{entry.profile.name}</Text>
                            <Text style={styles.friendUsername}>@{entry.profile.username}</Text>
                          </View>
                          <Pressable style={styles.acceptBtn} onPress={() => void accept(entry)}>
                            <Text style={styles.acceptBtnLabel}>{strings.friends.accept}</Text>
                          </Pressable>
                          <Pressable style={styles.rejectBtn} onPress={() => void remove(entry)}>
                            <Text style={styles.rejectBtnLabel}>{strings.friends.reject}</Text>
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                {/* Friends list */}
                {accepted.length > 0 ? (
                  <View>
                    <Text style={styles.sectionLabel}>
                      {strings.friends.yours} ({accepted.length})
                    </Text>
                    <View style={styles.list}>
                      {accepted.map((entry) => (
                        <View key={entry.id} style={styles.friendRow}>
                          <AvatarGlyph avatar={entry.profile.avatar} size={34} />
                          <View style={styles.friendText}>
                            <Text style={styles.friendName}>{entry.profile.name}</Text>
                            <Text style={styles.friendUsername}>@{entry.profile.username}</Text>
                          </View>
                          <Pressable style={styles.challengeBtn} onPress={() => setChallengeTarget(entry)}>
                            <Text style={styles.challengeBtnLabel}>{strings.friends.challenge}</Text>
                          </Pressable>
                          <Pressable style={styles.removeBtn} onPress={() => void remove(entry)}>
                            <Text style={styles.removeBtnLabel}>{strings.friends.remove}</Text>
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                {/* Sent pending */}
                {sentPending.length > 0 ? (
                  <View>
                    <Text style={styles.sectionLabel}>{strings.friends.sent}</Text>
                    <View style={styles.list}>
                      {sentPending.map((entry) => (
                        <View key={entry.id} style={styles.friendRow}>
                          <AvatarGlyph avatar={entry.profile.avatar} size={34} />
                          <View style={styles.friendText}>
                            <Text style={styles.friendName}>{entry.profile.name}</Text>
                            <Text style={styles.friendUsername}>@{entry.profile.username}</Text>
                          </View>
                          <Text style={styles.waitingLabel}>{strings.friends.waiting}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                {friends.length === 0 && searchResults.length === 0 ? (
                  <Text style={styles.emptyLabel}>{strings.friends.empty}</Text>
                ) : null}
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.navy,
    borderRadius: 20,
    width: 370,
    maxWidth: '100%',
    maxHeight: '90%',
    overflow: 'hidden',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,.08)',
  },
  headerIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerAvatar: { position: 'relative' },
  editAvatarBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.cyan,
    borderWidth: 2,
    borderColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarGlyph: { fontSize: 10 },
  headerName: { fontFamily: fontFamily.black, fontSize: 17, color: colors.cyan },
  headerUsername: { fontFamily: fontFamily.regular, fontSize: 11, color: 'rgba(255,255,255,.4)' },
  headerCoins: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  headerCoinsValue: { fontFamily: fontFamily.black, fontSize: 14, color: colors.gold },
  headerCoinsIcon: { fontSize: 12 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLabel: { color: 'rgba(255,255,255,.6)', fontSize: 16 },
  // Tabs
  tabs: {
    flexDirection: 'row',
    gap: 5,
    margin: 12,
    marginBottom: 4,
    backgroundColor: 'rgba(0,0,0,.22)',
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    position: 'relative',
  },
  tabActive: { backgroundColor: colors.cyan },
  tabLabel: { fontFamily: fontFamily.black, fontSize: 13, color: 'rgba(255,255,255,.4)' },
  tabLabelActive: { color: colors.navy },
  tabDot: {
    position: 'absolute',
    top: 3,
    left: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.pink,
  },
  // Body
  body: { padding: 16, paddingTop: 8, gap: 12 },
  profileBody: { gap: 14 },
  friendsBody: { gap: 14 },
  fieldLabel: { fontFamily: fontFamily.bold, fontSize: 11, color: 'rgba(255,255,255,.45)', marginBottom: 5 },
  pickerLabel: { fontFamily: fontFamily.bold, fontSize: 11, color: 'rgba(255,255,255,.45)', marginBottom: 8 },
  pickerHint: { opacity: 0.5, fontWeight: '400' },
  fieldInput: {
    borderRadius: 9,
    padding: 9,
    paddingHorizontal: 13,
    fontSize: 14,
    fontFamily: fontFamily.bold,
    backgroundColor: 'rgba(255,255,255,.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.12)',
    color: colors.offWhite,
    textAlign: 'right',
  },
  // Avatar picker
  avatarPicker: {
    backgroundColor: 'rgba(0,0,0,.2)',
    borderRadius: 12,
    padding: 12,
  },
  avatarPickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  uploadBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,.25)',
    backgroundColor: 'rgba(255,255,255,.04)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  uploadBtnActive: {
    borderColor: colors.cyan,
    backgroundColor: 'rgba(48,231,237,.15)',
  },
  uploadPreview: { width: '100%', height: '100%' },
  uploadGlyph: { fontSize: 17 },
  avatarCell: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,.12)',
    backgroundColor: 'rgba(255,255,255,.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCellActive: {
    borderColor: colors.cyan,
    backgroundColor: 'rgba(48,231,237,.15)',
  },
  avatarGlyph: { fontSize: 20 },
  // Username
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.12)',
    paddingHorizontal: 12,
  },
  usernameAt: { color: 'rgba(255,255,255,.35)', fontSize: 13, fontFamily: fontFamily.bold },
  usernameInput: {
    flex: 1,
    padding: 9,
    paddingRight: 4,
    fontSize: 14,
    fontFamily: fontFamily.bold,
    color: colors.offWhite,
    textAlign: 'right',
  },
  usernameInputLocked: { opacity: 0.5 },
  usernameStatus: { fontSize: 12 },
  usernameStatusOk: { color: colors.green },
  usernameStatusTaken: { color: colors.pink },
  usernameLocked: { color: colors.gold, fontSize: 11, fontWeight: '700' },
  usernameError: { fontSize: 11, color: colors.pink, marginTop: 4, fontFamily: fontFamily.regular },
  // Save / logout
  saveMsg: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.pink,
    textAlign: 'center',
    paddingVertical: 6,
  },
  saveMsgOk: { color: colors.green },
  saveBtn: {
    backgroundColor: colors.cyan,
    borderRadius: 11,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnLabel: { fontFamily: fontFamily.black, fontSize: 15, color: colors.navy },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,.08)' },
  logoutBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,61,104,.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,61,104,.25)',
  },
  logoutLabel: { fontFamily: fontFamily.black, fontSize: 14, color: colors.pink },
  // Friends
  searchRow: { flexDirection: 'row', gap: 7 },
  searchInput: {
    borderRadius: 9,
    padding: 9,
    paddingHorizontal: 13,
    fontSize: 14,
    fontFamily: fontFamily.bold,
    backgroundColor: 'rgba(255,255,255,.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.12)',
    color: colors.offWhite,
    textAlign: 'right',
  },
  searchBtn: {
    backgroundColor: colors.cyan,
    borderRadius: 9,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnLabel: { fontFamily: fontFamily.black, fontSize: 13, color: colors.navy },
  list: { gap: 6 },
  sectionLabel: { fontFamily: fontFamily.bold, fontSize: 11, color: 'rgba(255,255,255,.45)', marginBottom: 8 },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,.2)',
    borderRadius: 10,
    padding: 9,
    paddingHorizontal: 12,
  },
  friendText: { flex: 1, minWidth: 0 },
  friendName: { fontFamily: fontFamily.black, fontSize: 14, color: colors.offWhite },
  friendUsername: { fontFamily: fontFamily.regular, fontSize: 11, color: 'rgba(255,255,255,.35)' },
  addBtn: { backgroundColor: colors.cyan, borderRadius: 7, paddingVertical: 5, paddingHorizontal: 12 },
  addBtnLabel: { fontFamily: fontFamily.black, fontSize: 12, color: colors.navy },
  waitingLabel: { fontFamily: fontFamily.regular, fontSize: 11, color: 'rgba(255,255,255,.3)' },
  friendLabel: { fontFamily: fontFamily.regular, fontSize: 11, color: colors.green },
  acceptBtn: { backgroundColor: colors.green, borderRadius: 7, paddingVertical: 5, paddingHorizontal: 10 },
  acceptBtnLabel: { fontFamily: fontFamily.black, fontSize: 12, color: '#000' },
  rejectBtn: {
    backgroundColor: 'rgba(255,61,104,.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,61,104,.3)',
    borderRadius: 7,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  rejectBtnLabel: { fontFamily: fontFamily.black, fontSize: 12, color: colors.pink },
  challengeBtn: { backgroundColor: colors.cyan, borderRadius: 7, paddingVertical: 5, paddingHorizontal: 10 },
  challengeBtnLabel: { fontFamily: fontFamily.black, fontSize: 11, color: colors.navy },
  removeBtn: {
    backgroundColor: 'rgba(255,255,255,.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.1)',
    borderRadius: 7,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  removeBtnLabel: { fontFamily: fontFamily.regular, fontSize: 11, color: 'rgba(255,255,255,.35)' },
  emptyLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,.25)',
    textAlign: 'center',
    paddingVertical: 24,
  },
  // Challenge picker
  challengeOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 10,
  },
  challengeCard: {
    backgroundColor: colors.navy,
    borderRadius: 16,
    padding: 22,
    width: 320,
    maxWidth: '92%',
    borderWidth: 2,
    borderColor: colors.cyan,
    shadowColor: colors.cyan,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 12,
  },
  challengeTitle: { fontFamily: fontFamily.black, fontSize: 18, color: colors.offWhite, marginBottom: 4 },
  challengeSub: { fontFamily: fontFamily.regular, fontSize: 12, color: 'rgba(255,255,255,.4)', marginBottom: 18 },
  challengeModes: { gap: 10 },
  challengeModeBtn: {
    backgroundColor: 'rgba(48,231,237,.12)',
    borderWidth: 1,
    borderColor: 'rgba(48,231,237,.3)',
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  challengeModeLabel: { fontFamily: fontFamily.black, fontSize: 15, color: colors.offWhite, textAlign: 'right' },
  challengeCancel: { marginTop: 14, alignItems: 'center' },
  challengeCancelLabel: { fontFamily: fontFamily.regular, fontSize: 13, color: 'rgba(255,255,255,.3)' },
});
