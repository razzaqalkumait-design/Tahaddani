import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import Svg, { Polygon } from 'react-native-svg';
import type { ReactNode } from 'react';

/** A polygon point expressed as CSS-style percentages of the box. */
export interface ClipPoint {
  xPercent: number;
  yPercent: number;
}

/**
 * Applies a percentage-based polygon clip to its children, the native
 * equivalent of the web build's `clip-path: polygon(...)`.
 *
 * React Native has no clip-path, and react-native-svg can only clip SVG
 * content, so the shape is drawn as an SVG mask over an ordinary view.
 */
export function ClippedBox({
  points,
  style,
  children,
  pointerEvents,
}: {
  points: readonly ClipPoint[];
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** Pass 'none' when the box is decorative inside a Pressable, so the mask cannot eat touches. */
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const handleLayout = (event: LayoutChangeEvent): void => {
    const { width, height } = event.nativeEvent.layout;
    if (width === size.width && height === size.height) return;
    setSize({ width, height });
  };

  // The mask needs real pixel dimensions, so the first pass renders unclipped.
  const isMeasured = size.width > 0 && size.height > 0;

  const polygon = points
    .map((point) => `${(point.xPercent / 100) * size.width},${(point.yPercent / 100) * size.height}`)
    .join(' ');

  if (!isMeasured) {
    return (
      <View style={style} onLayout={handleLayout} pointerEvents={pointerEvents}>
        {children}
      </View>
    );
  }

  return (
    <View style={style} onLayout={handleLayout} pointerEvents={pointerEvents}>
      <MaskedView
        style={styles.mask}
        maskElement={
          <Svg width={size.width} height={size.height}>
            <Polygon points={polygon} fill="#000" />
          </Svg>
        }
      >
        {children}
      </MaskedView>
    </View>
  );
}

const styles = StyleSheet.create({
  mask: {
    flex: 1,
    // Keeps oversized children (watermarks) from painting past the shape.
    overflow: 'hidden',
  },
});

/** Parses `polygon(0% 0%, 100% 3%, ...)` into points. */
export function parseClipPolygon(value: string): ClipPoint[] {
  const inner = value.replace(/^polygon\(/, '').replace(/\)$/, '');
  return inner.split(',').flatMap((pair) => {
    const [rawX, rawY] = pair.trim().split(/\s+/);
    const xPercent = Number.parseFloat(rawX ?? '');
    const yPercent = Number.parseFloat(rawY ?? '');
    if (!Number.isFinite(xPercent) || !Number.isFinite(yPercent)) return [];
    return [{ xPercent, yPercent }];
  });
}
