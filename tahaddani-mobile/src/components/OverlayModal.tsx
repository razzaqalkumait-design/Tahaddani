import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { colors, fontFamily, radii, spacing } from '../theme/tokens';
import { strings } from '../i18n';

/**
 * Centered modal overlay on a dimmed backdrop, the native stand-in for the
 * web build's fixed-position overlays (spin wheel, records). Tapping the
 * backdrop closes; the card stops propagation like the web `stopPropagation`.
 */
export function OverlayModal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={strings.common.close} />
      <View style={styles.card}>{children}</View>
    </View>
  );
}

export function OverlayHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel={strings.common.close}>
        <Text style={styles.closeLabel}>✕</Text>
      </Pressable>
    </View>
  );
}

export function OverlayScroll({ children }: { children: ReactNode }) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,8,40,.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    zIndex: 600,
    elevation: 12,
  },
  card: {
    backgroundColor: colors.navy,
    borderRadius: radii.card,
    width: '100%',
    maxWidth: 460,
    maxHeight: '90%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(48,231,237,.25)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,.1)',
  },
  headerTitle: {
    fontFamily: fontFamily.black,
    fontSize: 16,
    color: colors.cyan,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLabel: {
    color: colors.offWhite,
    fontSize: 15,
    fontFamily: fontFamily.bold,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
});
