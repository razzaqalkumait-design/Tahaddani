/** Shared shape for every icon in this set. */
export interface IconProps {
  size?: number;
  color?: string;
  /** Secondary tone for two-tone icons (gems, highlights). Falls back to `color`. */
  accent?: string;
}

/** Every icon is drawn on the same 24x24 grid so weights stay consistent. */
export const ICON_VIEWBOX = '0 0 24 24';
export const DEFAULT_ICON_SIZE = 24;
