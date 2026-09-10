import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import { colors } from '../theme/tokens';

const DOT_SPACING = 20;
const DOT_RADIUS = 1.5;

/** The 20px dotted grid the web build paints with a radial-gradient. */
export function DottedBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="dots" width={DOT_SPACING} height={DOT_SPACING} patternUnits="userSpaceOnUse">
            <Circle cx={DOT_RADIUS} cy={DOT_RADIUS} r={DOT_RADIUS} fill={colors.dot} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#dots)" />
      </Svg>
    </View>
  );
}
