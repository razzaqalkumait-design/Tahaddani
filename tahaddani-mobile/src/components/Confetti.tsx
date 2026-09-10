import { useEffect, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

/** Same palette as the web build (src/screenTypes.ts CONFETTI_COLORS). */
const CONFETTI_COLORS = ['#30E7ED', '#DFC5FE', '#F9F9F9', '#38E27D', '#FF3D68', '#FFD700'] as const;

interface Piece {
  id: number;
  x: number; // left %, 0–100
  color: string;
  size: number;
  dur: number; // 2.2–4.4s, web: 2.2 + rand*2.2
  delay: number; // 0–1.8s, web: rand*1.8
}

/**
 * Confetti — the native twin of the web build's Confetti.tsx: 70 pieces with
 * the same color cycle, sizes and durations, falling the full screen height
 * with a 720° spin while fading out (web keyframes `confettiFall`).
 */
export function Confetti({ active }: { active: boolean }) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (!active) {
      setPieces([]);
      return;
    }
    setPieces(
      Array.from({ length: 70 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
        size: 7 + Math.random() * 8,
        dur: 2.2 + Math.random() * 2.2,
        delay: Math.random() * 1.8,
      })),
    );
  }, [active]);

  if (pieces.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p) => (
        <ConfettiPiece key={p.id} piece={p} />
      ))}
    </View>
  );
}

function ConfettiPiece({ piece }: { piece: Piece }) {
  const { height: screenH } = Dimensions.get('window');
  const fall = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    fall.setValue(0);
    const animation = Animated.timing(fall, {
      toValue: 1,
      duration: piece.dur * 1000,
      delay: piece.delay * 1000,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [fall, piece.dur, piece.delay]);

  const translateY = fall.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, screenH + 40],
  });
  const rotate = fall.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '720deg'],
  });
  const opacity = fall.interpolate({
    inputRange: [0, 0.75, 1],
    outputRange: [1, 1, 0],
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          left: `${piece.x}%`,
          width: piece.size,
          height: piece.size * 0.45,
          backgroundColor: piece.color,
          transform: [{ translateY }, { rotate }],
          opacity,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    top: -20,
    borderRadius: 3,
  },
});
