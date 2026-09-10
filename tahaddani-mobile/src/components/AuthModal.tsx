import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AccountCtx, AVATAR_FALLBACKS } from '../contexts/AccountContext';
import { CoinsCtx } from '../contexts/CoinsContext';
import { supabase } from '../lib/supabase';
import { isUsernameTaken } from '../lib/profiles';
import { validateDisplayName, validateUsername } from '../utils/profanity';
import { CoinIcon, EnvelopeIcon, SparkleIcon } from './icons';
import { colors, fontFamily, spacing } from '../theme/tokens';
import { strings } from '../i18n';
import { logger } from '../lib/logger';

type Tab = 'signup' | 'login';
type UsernameStatus = 'idle' | 'checking' | 'ok' | 'taken' | 'invalid';

const OTP_LENGTH = 8;
const MIN_PASSWORD = 6;
const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
const USERNAME_DEBOUNCE_MS = 500;
const WELCOME_COINS = 1000;

export function AuthModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { signup, createProfile, loginWithEmail, refreshAccount } = useContext(AccountCtx);
  const { addCoins } = useContext(CoinsCtx);

  const [tab, setTab] = useState<Tab>('signup');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [otpPhase, setOtpPhase] = useState(false);
  const [otp, setOtp] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [resent, setResent] = useState(false);
  const [successPhase, setSuccessPhase] = useState(false);

  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (usernameTimer.current) clearTimeout(usernameTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  const checkUsername = useCallback((value: string) => {
    setUsername(value);
    if (usernameTimer.current) clearTimeout(usernameTimer.current);

    const clean = value.toLowerCase().trim();
    if (!clean) {
      setUsernameStatus('idle');
      return;
    }
    if (!USERNAME_PATTERN.test(clean) || validateUsername(clean)) {
      setUsernameStatus('invalid');
      return;
    }

    setUsernameStatus('checking');
    usernameTimer.current = setTimeout(() => {
      void (async () => {
        try {
          const taken = await isUsernameTaken(clean);
          setUsernameStatus(taken ? 'taken' : 'ok');
        } catch (lookupError) {
          logger.warn('Username availability check failed');
          setUsernameStatus('idle');
        }
      })();
    }, USERNAME_DEBOUNCE_MS);
  }, []);

  const usernameOk = usernameStatus === 'ok';
  const canSubmitSignup =
    name.trim().length >= 2 &&
    username.trim().length >= 3 &&
    usernameOk &&
    email.includes('@') &&
    password.length >= MIN_PASSWORD &&
    !saving;
  const canSubmitLogin =
    (email.includes('@') || email.trim().length >= 3) && password.length >= MIN_PASSWORD && !saving;

  const reset = useCallback(() => {
    setTab('signup');
    setName('');
    setUsername('');
    setUsernameStatus('idle');
    setEmail('');
    setPassword('');
    setAvatarIndex(0);
    setError('');
    setOtp('');
    setOtpPhase(false);
    setPendingEmail('');
    setSuccessPhase(false);
  }, []);

  const dismiss = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleSignup = async () => {
    if (!canSubmitSignup) return;

    const nameError = validateDisplayName(name.trim());
    if (nameError) {
      setError(nameError);
      return;
    }

    setSaving(true);
    setError('');
    const failure = await signup(email.trim(), password);
    setSaving(false);

    if (failure) {
      setError(failure);
      return;
    }
    setPendingEmail(email.trim());
    setOtpPhase(true);
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== OTP_LENGTH) return;
    setSaving(true);
    setError('');

    const { error: otpError } = await supabase.auth.verifyOtp({
      email: pendingEmail,
      token: otp,
      type: 'signup',
    });
    if (otpError) {
      setSaving(false);
      setError(strings.auth.otpInvalid);
      return;
    }

    const profileError = await createProfile(name.trim(), username.toLowerCase().trim(), String(avatarIndex));
    setSaving(false);
    if (profileError) {
      setError(profileError);
      return;
    }

    await refreshAccount();
    addCoins(WELCOME_COINS);
    setSuccessPhase(true);
    closeTimer.current = setTimeout(dismiss, 2600);
  };

  const handleResend = async () => {
    await supabase.auth.resend({ type: 'signup', email: pendingEmail });
    setResent(true);
    setTimeout(() => setResent(false), 4000);
  };

  const handleLogin = async () => {
    if (!canSubmitLogin) return;
    setSaving(true);
    setError('');
    const failure = await loginWithEmail(email.trim(), password);
    setSaving(false);

    if (failure) {
      setError(failure);
      return;
    }
    dismiss();
  };

  const usernameHint = (): { text: string; tone: 'ok' | 'bad' | 'muted' } | null => {
    if (usernameStatus === 'checking') return { text: strings.auth.usernameChecking, tone: 'muted' };
    if (usernameStatus === 'ok') return { text: strings.auth.usernameOk, tone: 'ok' };
    if (usernameStatus === 'taken') return { text: strings.auth.usernameTaken, tone: 'bad' };
    if (usernameStatus === 'invalid') return { text: strings.auth.usernameInvalid, tone: 'bad' };
    return null;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={dismiss}
      supportedOrientations={['landscape', 'landscape-left', 'landscape-right']}
    >
      <View style={styles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.centering}>
          {successPhase ? (
            <View style={styles.successCard}>
              <SparkleIcon size={44} color={colors.cyan} />
              <Text style={styles.successTitle}>
                {strings.auth.welcome} {name.trim()}
              </Text>
              <View style={styles.giftRow}>
                <Text style={styles.giftAmount}>+{WELCOME_COINS.toLocaleString('en-US')}</Text>
                <CoinIcon size={22} color={colors.gold} accent={colors.navy} />
              </View>
              <Text style={styles.successNote}>{strings.auth.welcomeGift}</Text>
            </View>
          ) : otpPhase ? (
            <View style={styles.card}>
              <View style={styles.otpHeader}>
                <EnvelopeIcon size={40} color={colors.cyan} />
                <Text style={styles.otpTitle}>{strings.auth.otpTitle}</Text>
                <Text style={styles.otpBody}>{strings.auth.otpBody}</Text>
                <Text style={styles.otpEmail}>{pendingEmail}</Text>
              </View>

              <TextInput
                style={styles.otpInput}
                value={otp}
                onChangeText={(value) => {
                  setOtp(value.replace(/\D/g, '').slice(0, OTP_LENGTH));
                  setError('');
                }}
                placeholder={strings.auth.otpPlaceholder}
                placeholderTextColor="rgba(255,255,255,.25)"
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                autoFocus
                accessibilityLabel={strings.auth.otpTitle}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <PrimaryButton
                label={strings.auth.otpConfirm}
                onPress={() => void handleVerifyOtp()}
                disabled={otp.length !== OTP_LENGTH || saving}
                busy={saving}
              />
              <Pressable onPress={() => void handleResend()} accessibilityRole="button">
                <Text style={[styles.linkText, resent && styles.linkOk]}>
                  {resent ? strings.auth.otpResent : strings.auth.otpResend}
                </Text>
              </Pressable>
              <Pressable onPress={dismiss} accessibilityRole="button">
                <Text style={styles.linkText}>{strings.auth.cancel}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.card}>
              <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
                <View style={styles.tabs}>
                  {(['signup', 'login'] as const).map((value) => (
                    <Pressable
                      key={value}
                      style={[styles.tab, tab === value && styles.tabActive]}
                      onPress={() => {
                        setTab(value);
                        setError('');
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: tab === value }}
                    >
                      <Text style={[styles.tabLabel, tab === value && styles.tabLabelActive]}>
                        {value === 'signup' ? strings.auth.tabSignup : strings.auth.tabLogin}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {tab === 'signup' ? (
                  <>
                    <Text style={styles.label}>{strings.auth.avatarLabel}</Text>
                    <View style={styles.avatarRow}>
                      {AVATAR_FALLBACKS.map((glyph, index) => (
                        <Pressable
                          key={glyph}
                          style={[styles.avatar, avatarIndex === index && styles.avatarActive]}
                          onPress={() => setAvatarIndex(index)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: avatarIndex === index }}
                          accessibilityLabel={`${strings.auth.avatarLabel} ${index + 1}`}
                        >
                          <Text style={styles.avatarGlyph}>{glyph}</Text>
                        </Pressable>
                      ))}
                    </View>

                    <Field
                      label={strings.auth.nameLabel}
                      value={name}
                      onChangeText={setName}
                      placeholder={strings.auth.namePlaceholder}
                    />
                    <Field
                      label={strings.auth.usernameLabel}
                      value={username}
                      onChangeText={checkUsername}
                      placeholder={strings.auth.usernamePlaceholder}
                      autoCapitalize="none"
                      ltr
                      hint={usernameHint()}
                    />
                    <Field
                      label={strings.auth.emailLabel}
                      value={email}
                      onChangeText={setEmail}
                      placeholder={strings.auth.emailPlaceholder}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      ltr
                    />
                    <Field
                      label={strings.auth.passwordLabel}
                      value={password}
                      onChangeText={setPassword}
                      placeholder={strings.auth.passwordPlaceholder}
                      secureTextEntry
                      ltr
                    />
                  </>
                ) : (
                  <>
                    <Field
                      label={strings.auth.loginIdLabel}
                      value={email}
                      onChangeText={setEmail}
                      placeholder={strings.auth.emailPlaceholder}
                      autoCapitalize="none"
                      ltr
                    />
                    <Field
                      label={strings.auth.passwordLabel}
                      value={password}
                      onChangeText={setPassword}
                      placeholder={strings.auth.passwordPlaceholder}
                      secureTextEntry
                      ltr
                    />
                  </>
                )}

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <PrimaryButton
                  label={tab === 'signup' ? strings.auth.submitSignup : strings.auth.submitLogin}
                  onPress={() => void (tab === 'signup' ? handleSignup() : handleLogin())}
                  disabled={tab === 'signup' ? !canSubmitSignup : !canSubmitLogin}
                  busy={saving}
                />
                <Pressable onPress={dismiss} accessibilityRole="button">
                  <Text style={styles.linkText}>{strings.auth.cancel}</Text>
                </Pressable>
              </ScrollView>
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Field({
  label,
  hint,
  ltr = false,
  ...input
}: React.ComponentProps<typeof TextInput> & {
  label: string;
  hint?: { text: string; tone: 'ok' | 'bad' | 'muted' } | null;
  ltr?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...input}
        style={[styles.input, ltr && styles.inputLtr]}
        placeholderTextColor="rgba(255,255,255,.25)"
        accessibilityLabel={label}
      />
      {hint ? (
        <Text
          style={[
            styles.hint,
            hint.tone === 'ok' && styles.hintOk,
            hint.tone === 'bad' && styles.hintBad,
          ]}
        >
          {hint.text}
        </Text>
      ) : null}
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
  busy,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
  busy: boolean;
}) {
  return (
    <Pressable
      style={[styles.primary, disabled && styles.primaryDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled, busy }}
      accessibilityLabel={label}
    >
      {busy ? (
        <ActivityIndicator color={colors.navy} />
      ) : (
        <Text style={[styles.primaryLabel, disabled && styles.primaryLabelDisabled]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,8,40,.9)' },
  centering: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: {
    backgroundColor: colors.navy,
    borderRadius: 20,
    width: 380,
    maxWidth: '100%',
    maxHeight: '92%',
    padding: spacing.lg,
  },
  form: { gap: spacing.md, paddingBottom: spacing.sm },
  tabs: { flexDirection: 'row', gap: 6, backgroundColor: 'rgba(0,0,0,.25)', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  tabActive: { backgroundColor: colors.cyan },
  tabLabel: { fontFamily: fontFamily.black, fontSize: 14, color: 'rgba(255,255,255,.45)' },
  tabLabelActive: { color: colors.navy },
  field: { gap: 6 },
  label: { fontFamily: fontFamily.bold, fontSize: 12, color: 'rgba(255,255,255,.5)' },
  input: {
    backgroundColor: 'rgba(255,255,255,.07)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    fontFamily: fontFamily.medium,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.12)',
  },
  inputLtr: { textAlign: 'left', writingDirection: 'ltr' },
  hint: { fontFamily: fontFamily.regular, fontSize: 11, color: 'rgba(255,255,255,.4)' },
  hintOk: { color: colors.green },
  hintBad: { color: colors.pink },
  avatarRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,.1)',
    backgroundColor: 'rgba(255,255,255,.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarActive: { borderColor: colors.cyan, backgroundColor: 'rgba(48,231,237,.15)' },
  avatarGlyph: { fontSize: 20 },
  error: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.pink,
    backgroundColor: 'rgba(255,61,104,.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,61,104,.3)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  primary: {
    backgroundColor: colors.cyan,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryDisabled: { backgroundColor: 'rgba(48,231,237,.2)' },
  primaryLabel: { fontFamily: fontFamily.black, fontSize: 16, color: colors.navy },
  primaryLabelDisabled: { color: 'rgba(255,255,255,.3)' },
  linkText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,.35)',
    textAlign: 'center',
    paddingVertical: 6,
  },
  linkOk: { color: colors.green },
  otpHeader: { alignItems: 'center', gap: 6, marginBottom: spacing.md },
  otpTitle: { fontFamily: fontFamily.black, fontSize: 20, color: colors.cyan },
  otpBody: { fontFamily: fontFamily.regular, fontSize: 13, color: 'rgba(255,255,255,.45)', textAlign: 'center' },
  otpEmail: { fontFamily: fontFamily.medium, fontSize: 13, color: 'rgba(255,255,255,.7)', writingDirection: 'ltr' },
  otpInput: {
    backgroundColor: 'rgba(255,255,255,.07)',
    borderRadius: 12,
    paddingVertical: 14,
    fontSize: 28,
    letterSpacing: 10,
    textAlign: 'center',
    writingDirection: 'ltr',
    fontFamily: fontFamily.black,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.12)',
    marginBottom: spacing.md,
  },
  successCard: {
    backgroundColor: colors.navy,
    borderRadius: 20,
    width: 320,
    maxWidth: '100%',
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  successTitle: { fontFamily: fontFamily.black, fontSize: 22, color: colors.cyan, textAlign: 'center' },
  giftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,215,0,.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,215,0,.3)',
    borderRadius: 12,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  giftAmount: { fontFamily: fontFamily.black, fontSize: 28, color: colors.gold, writingDirection: 'ltr' },
  successNote: { fontFamily: fontFamily.regular, fontSize: 13, color: 'rgba(255,255,255,.4)', textAlign: 'center' },
});
