import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';
import { DEFAULT_ICON_SIZE, ICON_VIEWBOX } from './types';
import type { IconProps } from './types';

/** Crown: subscription-locked cards, VIP badge, premium store tiers. */
export function CrownIcon({ size = DEFAULT_ICON_SIZE, color = '#FFD700', accent }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={ICON_VIEWBOX}>
      <Path d="M3 7.8 L7.2 12.6 L12 5 L16.8 12.6 L21 7.8 L19.7 17.2 L4.3 17.2 Z" fill={color} />
      <Rect x="3.6" y="17.8" width="16.8" height="3.9" rx="1.3" fill={color} />
      <Circle cx="3" cy="7.2" r="1.7" fill={color} />
      <Circle cx="12" cy="4.3" r="2" fill={color} />
      <Circle cx="21" cy="7.2" r="1.7" fill={color} />
      <Circle cx="8.4" cy="19.7" r="1" fill={accent ?? color} opacity={accent ? 1 : 0.35} />
      <Circle cx="12" cy="19.7" r="1" fill={accent ?? color} opacity={accent ? 1 : 0.35} />
      <Circle cx="15.6" cy="19.7" r="1" fill={accent ?? color} opacity={accent ? 1 : 0.35} />
    </Svg>
  );
}

/** Prize wheel: the daily spin reward. */
export function SpinWheelIcon({ size = DEFAULT_ICON_SIZE, color = '#001B87', accent }: IconProps) {
  const spokes = [
    ['13.6', '8.4', '13.6', '20.4'],
    ['7.6', '14.4', '19.6', '14.4'],
    ['9.4', '10.2', '17.8', '18.6'],
    ['17.8', '10.2', '9.4', '18.6'],
  ] as const;

  return (
    <Svg width={size} height={size} viewBox={ICON_VIEWBOX}>
      {/* Pointer sits clear of the rim so the silhouette stays legible small. */}
      <Path d="M13.6 1 L16.5 6 L10.7 6 Z" fill={accent ?? color} />
      <Circle cx="13.6" cy="14.4" r="6.8" stroke={color} strokeWidth="1.9" fill="none" />
      {spokes.map((spoke) => (
        <Line
          key={spoke.join('-')}
          x1={spoke[0]}
          y1={spoke[1]}
          x2={spoke[2]}
          y2={spoke[3]}
          stroke={color}
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      ))}
      <Circle cx="13.6" cy="14.4" r="1.9" fill={color} />
    </Svg>
  );
}

/** Four-point sparkle: the create-account call to action. */
export function SparkleIcon({ size = DEFAULT_ICON_SIZE, color = '#30E7ED' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={ICON_VIEWBOX}>
      <Path
        d="M12 1.8 C13 8.8 15.2 11 22.2 12 C15.2 13 13 15.2 12 22.2 C11 15.2 8.8 13 1.8 12 C8.8 11 11 8.8 12 1.8 Z"
        fill={color}
      />
    </Svg>
  );
}

/** Envelope: the unverified-email banner. */
export function EnvelopeIcon({ size = DEFAULT_ICON_SIZE, color = '#30E7ED' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={ICON_VIEWBOX}>
      <Rect x="2.2" y="4.8" width="19.6" height="14.4" rx="2.4" stroke={color} strokeWidth="1.8" fill="none" />
      <Path
        d="M3.6 6.6 L12 13 L20.4 6.6"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** Globe: the online match button. */
export function GlobeIcon({ size = DEFAULT_ICON_SIZE, color = '#001B87' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={ICON_VIEWBOX}>
      <Circle cx="12" cy="12" r="9.1" stroke={color} strokeWidth="1.8" fill="none" />
      <Ellipse cx="12" cy="12" rx="4" ry="9.1" stroke={color} strokeWidth="1.5" fill="none" />
      <Line x1="3.1" y1="12" x2="20.9" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="5.1" y1="6.9" x2="18.9" y2="6.9" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <Line x1="5.1" y1="17.1" x2="18.9" y2="17.1" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </Svg>
  );
}

/** Five-point star: the premium pack tier label. */
export function StarIcon({ size = DEFAULT_ICON_SIZE, color = '#FFD700' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={ICON_VIEWBOX}>
      <Path
        d="M12 2 L14.9 8.9 L22.4 9.6 L16.7 14.6 L18.4 22 L12 18.1 L5.6 22 L7.3 14.6 L1.6 9.6 L9.1 8.9 Z"
        fill={color}
      />
    </Svg>
  );
}

/** Coin: paired with balances where the PNG asset is too heavy. */
export function CoinIcon({ size = DEFAULT_ICON_SIZE, color = '#001B87', accent }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={ICON_VIEWBOX}>
      <Circle cx="12" cy="12" r="9.2" fill={color} />
      <Circle cx="12" cy="12" r="6.4" stroke={accent ?? '#30E7ED'} strokeWidth="1.4" fill="none" />
      <Path
        d="M12 7.6 v8.8 M9.6 9.9 h3.6 a1.9 1.9 0 0 1 0 3.8 h-3"
        stroke={accent ?? '#30E7ED'}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
