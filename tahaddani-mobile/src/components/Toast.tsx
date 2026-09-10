import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { colors, fontFamily } from '../theme/tokens';

/** Auto-dismissing bottom toast, the native twin of the web store's toast. */
export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => onDone());
    }, 2500);
    return () => clearTimeout(timer);
  }, [message, onDone, opacity]);

  return (
    <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
      <Text style={styles.label}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: colors.navy,
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 20,
    zIndex: 900,
    elevation: 16,
  },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.offWhite,
  },
});
