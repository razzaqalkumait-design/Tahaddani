import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';
import { DEFAULT_ICON_SIZE, ICON_VIEWBOX } from './types';
import type { IconProps } from './types';

/** رياضة: football. */
export function BallIcon({ size = DEFAULT_ICON_SIZE, color = '#001B87' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={ICON_VIEWBOX}>
      {/*
        Solid disc with the centre pentagon and rim patches knocked out via
        even-odd fill. Outline-plus-spokes reads as a ship's wheel at this size,
        and cut-outs need no background colour to sit on.
      */}
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2.9 a9.1 9.1 0 1 0 0 18.2 a9.1 9.1 0 1 0 0 -18.2 Z
           M12 7.9 L15.3 10.3 L14 14.2 L10 14.2 L8.7 10.3 Z
           M12 3.6 L14.4 5.4 L13.5 7 L10.5 7 L9.6 5.4 Z
           M19.7 9.6 L20.3 12.3 L18.7 13.4 L16.2 11.2 L17.2 9.1 Z
           M4.3 9.6 L6.8 9.1 L7.8 11.2 L5.3 13.4 L3.7 12.3 Z
           M8.6 19.6 L7.7 17.1 L9.4 15.7 L12 17.2 L11.4 19.6 Z
           M15.4 19.6 L12.6 19.6 L12 17.2 L14.6 15.7 L16.3 17.1 Z"
        fill={color}
      />
    </Svg>
  );
}

/** أفلام ومسلسلات: film strip. */
export function FilmIcon({ size = DEFAULT_ICON_SIZE, color = '#001B87' }: IconProps) {
  const holes = [6.2, 10.4, 14.6];
  return (
    <Svg width={size} height={size} viewBox={ICON_VIEWBOX}>
      <Rect x="2.4" y="4.2" width="19.2" height="15.6" rx="2.2" stroke={color} strokeWidth="1.8" fill="none" />
      <Line x1="7.4" y1="4.2" x2="7.4" y2="19.8" stroke={color} strokeWidth="1.5" />
      <Line x1="16.6" y1="4.2" x2="16.6" y2="19.8" stroke={color} strokeWidth="1.5" />
      {holes.map((y) => (
        <Rect key={`l-${y}`} x="3.9" y={y} width="2" height="2.2" rx="0.6" fill={color} />
      ))}
      {holes.map((y) => (
        <Rect key={`r-${y}`} x="18.1" y={y} width="2" height="2.2" rx="0.6" fill={color} />
      ))}
    </Svg>
  );
}

/** عالم الحيوان: paw print. Reads far better than a face at 20px. */
export function PawIcon({ size = DEFAULT_ICON_SIZE, color = '#001B87' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={ICON_VIEWBOX}>
      <Ellipse cx="6.6" cy="9.4" rx="2.5" ry="3.1" fill={color} />
      <Ellipse cx="10.6" cy="5.9" rx="2.4" ry="3.2" fill={color} />
      <Ellipse cx="15.6" cy="6.4" rx="2.4" ry="3.2" fill={color} />
      <Ellipse cx="19.1" cy="10.4" rx="2.3" ry="2.9" fill={color} />
      <Path
        d="M12.4 11.4 c3.4 0 6.2 2.6 6.2 5.4 c0 2.3 -2 3.7 -4.3 3.1 c-1.3 -0.3 -2.6 -0.3 -3.9 0 c-2.3 0.6 -4.3 -0.8 -4.3 -3.1 c0 -2.8 2.8 -5.4 6.3 -5.4 Z"
        fill={color}
      />
    </Svg>
  );
}

/** جغرافيا: pin over a meridian, distinct from the online globe. */
export function MapPinIcon({ size = DEFAULT_ICON_SIZE, color = '#001B87' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={ICON_VIEWBOX}>
      <Path
        d="M12 2.2 c-3.8 0 -6.9 3 -6.9 6.8 c0 5 6.9 12.8 6.9 12.8 s6.9 -7.8 6.9 -12.8 c0 -3.8 -3.1 -6.8 -6.9 -6.8 Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx="12" cy="9" r="2.7" fill={color} />
    </Svg>
  );
}

/** علوم وتكنولوجيا: lab flask. */
export function FlaskIcon({ size = DEFAULT_ICON_SIZE, color = '#001B87' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={ICON_VIEWBOX}>
      <Path
        d="M9.6 2.8 h4.8 M10.6 2.8 v6.4 L5.1 18.6 a2.1 2.1 0 0 0 1.8 3.2 h10.2 a2.1 2.1 0 0 0 1.8 -3.2 L13.4 9.2 V2.8"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path d="M7.7 15.2 h8.6 a2.1 2.1 0 0 1 1.8 3.4 a2.1 2.1 0 0 1 -1.8 3.2 H6.9 a2.1 2.1 0 0 1 -1.8 -3.2 Z" fill={color} />
    </Svg>
  );
}

/** طعام وطبخ: burger. */
export function BurgerIcon({ size = DEFAULT_ICON_SIZE, color = '#001B87' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={ICON_VIEWBOX}>
      <Path d="M2.8 9.8 c0 -4 4.1 -6.6 9.2 -6.6 c5.1 0 9.2 2.6 9.2 6.6 Z" fill={color} />
      <Rect x="2.8" y="11.2" width="18.4" height="2.9" rx="1.45" fill={color} />
      <Path d="M2.8 15.6 h18.4 v1.5 a3.6 3.6 0 0 1 -3.6 3.6 H6.4 a3.6 3.6 0 0 1 -3.6 -3.6 Z" fill={color} />
    </Svg>
  );
}

/** موسيقى: beamed eighth notes. */
export function MusicIcon({ size = DEFAULT_ICON_SIZE, color = '#001B87' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={ICON_VIEWBOX}>
      <Path d="M9.4 17.4 V4.8 L20.2 2.6 V15.2" stroke={color} strokeWidth="1.9" strokeLinecap="round" fill="none" />
      <Path d="M9.4 8.4 L20.2 6.2" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
      <Ellipse cx="6.7" cy="17.6" rx="3.1" ry="2.5" fill={color} />
      <Ellipse cx="17.5" cy="15.4" rx="3.1" ry="2.5" fill={color} />
    </Svg>
  );
}

/** تاريخ إسلامي: mosque with dome and minarets. */
export function MosqueIcon({ size = DEFAULT_ICON_SIZE, color = '#001B87' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={ICON_VIEWBOX}>
      {/* Drawn as outlines so the doorway is an opening and the icon takes any colour. */}
      <Path
        d="M12 2.6 c2.8 2.2 4.5 4.2 4.5 6.4 h-9 c0 -2.2 1.7 -4.2 4.5 -6.4 Z"
        stroke={color}
        strokeWidth="1.7"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M7.5 10.7 h9 v10.1 h-9 Z"
        stroke={color}
        strokeWidth="1.7"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M12 14.2 a2.1 2.1 0 0 1 2.1 2.1 v4.5 h-4.2 v-4.5 a2.1 2.1 0 0 1 2.1 -2.1 Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      <Rect x="3.3" y="8.2" width="2.5" height="12.6" rx="1.25" stroke={color} strokeWidth="1.6" fill="none" />
      <Rect x="18.2" y="8.2" width="2.5" height="12.6" rx="1.25" stroke={color} strokeWidth="1.6" fill="none" />
      <Circle cx="4.55" cy="5.9" r="1.5" fill={color} />
      <Circle cx="19.45" cy="5.9" r="1.5" fill={color} />
    </Svg>
  );
}
