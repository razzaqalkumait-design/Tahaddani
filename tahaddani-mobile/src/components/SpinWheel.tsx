import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, fontFamily, radii, spacing } from '../theme/tokens';
import { strings } from '../i18n';
import { WHEEL_SEGMENTS, pickWheelSegment } from '../lib/wheel';
import type { WheelSegment } from '../lib/wheel';

const SIZE = 280;
const SPIN_MS = 4000;

function polar(center: number, radius: number, angle: number): [number, number] {
  return [center + radius * Math.cos(angle), center + radius * Math.sin(angle)];
}

function arcPath(center: number, radius: number, startAngle: number, endAngle: number): string {
  const [x1, y1] = polar(center, radius, startAngle);
  const [x2, y2] = polar(center, radius, endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${center} ${center} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

/**
 * Daily spin wheel overlay — the native twin of the web build's canvas
 * wheel. The prize is decided up front (weighted), then the wheel animates
 * so the winning segment lands under the top pointer.
 */
export function SpinWheel({ onClose, onReward }: { onClose: () => void; onReward: (segment: WheelSegment) => void }) {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;
  const startRotRef = useRef(0);

  const segAngle = (2 * Math.PI) / WHEEL_SEGMENTS.length;
  const center = SIZE / 2;
  const radius = center - 10;
  const rotRad = (rotation * Math.PI) / 180;

  useEffect(() => {
    const id = anim.addListener(({ value }) => {
      setRotation((startRotRef.current + value) % 360);
    });
    return () => anim.removeListener(id);
  }, [anim]);

  const doSpin = () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    const winIdx = pickWheelSegment();
    const targetAngle = 360 * 7 + (360 - (winIdx * (360 / WHEEL_SEGMENTS.length) + 360 / WHEEL_SEGMENTS.length / 2));
    startRotRef.current = rotation;
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: targetAngle,
      duration: SPIN_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      setRotation((startRotRef.current + targetAngle) % 360);
      setResult(winIdx);
      setSpinning(false);
    });
  };

  const labelPositions = WHEEL_SEGMENTS.map((seg, i) => {
    const mid = rotRad + i * segAngle + segAngle / 2;
    const [lx, ly] = polar(center, radius * 0.62, mid);
    return { seg, lx, ly };
  });

  return (
    <View style={styles.backdrop}>
      <Text style={styles.title}>🎡 {strings.store.daily}</Text>

      <View style={styles.wheelWrap}>
        {/* Top pointer */}
        <View style={styles.pointer} />
        <Svg width={SIZE} height={SIZE}>
          {WHEEL_SEGMENTS.map((seg, i) => {
            const start = rotRad + i * segAngle - Math.PI / 2;
            const end = start + segAngle;
            return (
              <Path
                key={i}
                d={arcPath(center, radius, start, end)}
                fill={seg.color}
                stroke={colors.navy}
                strokeWidth={2}
              />
            );
          })}
          <Circle cx={center} cy={center} r={22} fill={colors.navy} stroke={colors.cyan} strokeWidth={3} />
        </Svg>
        <Text style={styles.centerLabel} pointerEvents="none">
          {strings.store.spinGo}
        </Text>
        {/* Labels drawn as views so Arabic text renders crisply. */}
        {labelPositions.map(({ seg, lx, ly }, i) => (
          <Text
            key={i}
            style={[
              styles.segLabel,
              {
                left: lx,
                top: ly,
                transform: [{ translateX: -30 }, { translateY: -8 }],
              },
            ]}
            numberOfLines={1}
          >
            {seg.emoji}
          </Text>
        ))}
      </View>

      {result !== null ? (
        <View style={styles.resultBox}>
          <Text style={styles.resultEmoji}>{WHEEL_SEGMENTS[result]?.emoji}</Text>
          <Text style={[styles.resultLabel, { color: WHEEL_SEGMENTS[result]?.color ?? colors.cyan }]}>
            {WHEEL_SEGMENTS[result]?.label}
          </Text>
          <Pressable style={styles.claimBtn} onPress={() => result !== null && onReward(WHEEL_SEGMENTS[result]!)}>
            <Text style={styles.claimLabel}>{strings.store.claimReward}</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.hint}>{spinning ? strings.store.spinning : strings.store.tapToSpin}</Text>
      )}

      {!spinning && result === null ? (
        <Pressable style={styles.spinBtn} onPress={doSpin}>
          <Text style={styles.spinBtnLabel}>{strings.store.spinGo}</Text>
        </Pressable>
      ) : null}

      <Pressable style={styles.closeBtn} onPress={onClose}>
        <Text style={styles.closeLabel}>{strings.common.close}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
    zIndex: 300,
    elevation: 20,
  },
  title: {
    fontFamily: fontFamily.black,
    fontSize: 22,
    color: colors.cyan,
  },
  wheelWrap: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 4,
    borderColor: colors.cyan,
    overflow: 'hidden',
  },
  pointer: {
    position: 'absolute',
    top: -14,
    alignSelf: 'center',
    zIndex: 2,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 22,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.pink,
  },
  segLabel: {
    position: 'absolute',
    fontFamily: fontFamily.black,
    fontSize: 15,
    color: colors.navy,
    width: 60,
    textAlign: 'center',
  },
  centerLabel: {
    position: 'absolute',
    left: SIZE / 2 - 20,
    top: SIZE / 2 - 8,
    width: 40,
    fontFamily: fontFamily.black,
    fontSize: 10,
    color: colors.cyan,
    textAlign: 'center',
  },
  resultBox: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  resultEmoji: {
    fontSize: 44,
  },
  resultLabel: {
    fontFamily: fontFamily.black,
    fontSize: 20,
  },
  claimBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.cyan,
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: 32,
    shadowColor: colors.navy,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  claimLabel: {
    fontFamily: fontFamily.black,
    fontSize: 16,
    color: colors.navy,
  },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,.5)',
  },
  spinBtn: {
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderWidth: 2,
    borderColor: colors.cyan,
  },
  spinBtnLabel: {
    fontFamily: fontFamily.black,
    fontSize: 15,
    color: colors.cyan,
  },
  closeBtn: {
    backgroundColor: 'rgba(255,255,255,.1)',
    borderRadius: radii.md,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  closeLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.offWhite,
  },
});
