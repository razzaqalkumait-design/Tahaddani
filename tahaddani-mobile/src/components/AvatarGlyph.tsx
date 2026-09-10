import { Image, StyleSheet, Text } from 'react-native';
import { AVATAR_FALLBACKS } from '../contexts/AccountContext';

/**
 * Avatar rendering — the native twin of the web build's resolveAvatar /
 * AvatarImg. `avatar` is either an uploaded URL (http…) or a preset index
 * string; presets render as their emoji fallback (the mobile app has no
 * preset PNGs — same fallbacks the web build uses when images fail).
 */
export function resolveAvatarGlyph(avatar: string): { uri: string | null; glyph: string } {
  if (avatar.startsWith('http')) {
    return { uri: avatar, glyph: '😎' };
  }
  const idx = Number(avatar);
  return { uri: null, glyph: AVATAR_FALLBACKS[idx] ?? '😎' };
}

export function AvatarGlyph({ avatar, size = 34 }: { avatar: string; size?: number }) {
  const { uri, glyph } = resolveAvatarGlyph(avatar);
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return <Text style={[styles.glyph, { fontSize: size * 0.55, lineHeight: size }]}>{glyph}</Text>;
}

const styles = StyleSheet.create({
  glyph: {
    textAlign: 'center',
  },
});
