import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, fontFamily } from '../theme/tokens';

/**
 * Ring countdown used by the board game and solo mode — the native twin of
 * the web build's TimerArc (`strokeDashoffset` progress around a circle).
 */
export function TimerRing({
  timeLeft,
  total,
  urgentColor,
}: {
  timeLeft: number;
  total: number;
  /** Override for the urgent ring color (defaults to pink). */
  urgentColor?: string;
}) {
  const size = 72;
  const r = 28;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, timeLeft / total);
  const urgent = timeLeft <= 10;
  const urgentStroke = urgentColor ?? colors.pink;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(0,27,135,.12)"
          strokeWidth={5}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={urgent ? urgentStroke : colors.navy}
          strokeWidth={5}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={circumference * (1 - pct)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.value, urgent && { color: urgentStroke }]}>{timeLeft}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontFamily: fontFamily.black,
    fontSize: 22,
    color: colors.navy,
  },
  urgent: {
    color: colors.pink,
  },
});
