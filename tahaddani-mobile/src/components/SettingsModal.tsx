import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useContext } from 'react';
import { AccountCtx } from '../contexts/AccountContext';
import { IMAGES } from '../theme/cards';
import { colors, fontFamily, radii, spacing } from '../theme/tokens';
import { strings } from '../i18n';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function SettingsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { account, logout } = useContext(AccountCtx);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={['landscape', 'landscape-left', 'landscape-right']}
    >
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel={strings.common.close}>
        {/* Catches taps so they never reach the dismissing backdrop below. */}
        <Pressable style={styles.card} onPress={() => {}}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <Image source={IMAGES.settingsWhite} style={styles.headerIcon} resizeMode="contain" />
              <Text style={styles.title}>{strings.settings.title}</Text>
            </View>

            <Row label={strings.settings.language} value={strings.settings.languageValue} />
            <Row label={strings.settings.version} value={strings.settings.versionValue} />

            {account ? (
              <>
                <View style={styles.divider} />
                <Pressable
                  style={styles.logout}
                  onPress={() => {
                    void logout();
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={strings.settings.logout}
                >
                  <Text style={styles.logoutLabel}>{strings.settings.logout}</Text>
                </Pressable>
              </>
            ) : null}

            <Pressable style={styles.close} onPress={onClose} accessibilityRole="button">
              <Text style={styles.closeLabel}>{strings.common.close}</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: { backgroundColor: colors.navy, borderRadius: 10, width: 360, maxWidth: '100%', maxHeight: '92%' },
  content: { padding: spacing.xl, gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerIcon: { width: 32, height: 32 },
  title: { fontFamily: fontFamily.black, fontSize: 24, color: colors.offWhite },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { fontFamily: fontFamily.bold, fontSize: 14, color: 'rgba(255,255,255,.55)' },
  rowValue: { fontFamily: fontFamily.black, fontSize: 14, color: colors.cyan },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,.1)' },
  logout: { paddingVertical: spacing.md, alignItems: 'center', borderRadius: radii.md, borderWidth: 1, borderColor: colors.pink },
  logoutLabel: { fontFamily: fontFamily.black, fontSize: 14, color: colors.pink },
  close: {
    marginTop: spacing.sm,
    backgroundColor: colors.cyan,
    borderRadius: radii.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  closeLabel: { fontFamily: fontFamily.black, fontSize: 16, color: colors.navy },
});
