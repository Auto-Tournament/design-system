/**
 * Auto Tournament design tokens. Colours are CSS variables, so a theme can be
 * swapped at runtime (`themeVars`), with Ember as the fallback when an app sets none.
 */
import { DEFAULT_THEME_ID, THEME_COLORS, type ThemeColorOverrides, type ThemeId } from './themes';

export type ColorKey = keyof ThemeColorOverrides;

const cssVar = (key: string) => `--at-${key.replace(/[A-Z0-9]/g, (c) => `-${c.toLowerCase()}`)}`;
const ember = THEME_COLORS[DEFAULT_THEME_ID];

const appColor = {
  warning: '#f2b84b', // amber, kept apart from the brand orange
  info: '#7fb0e8',
  scrim: 'rgba(8, 4, 3, 0.72)', // dialog backdrop
  shadow: 'rgba(0, 0, 0, 0.45)',
  // CS2 side colours, used on scoreboards and side picks.
  sideCt: '#7fb0e8',
  sideT: '#e8b04b',
  // Leaderboard medals for places 1-3.
  medalGold: '#f2c14b',
  medalSilver: '#c4bcb9',
  medalBronze: '#c98a5a',
} as const;

export const tokens = {
  color: {
    ...(Object.fromEntries(
      Object.entries(ember).map(([k, v]) => [k, `var(${cssVar(k)}, ${v})`])
    ) as Record<ColorKey, string>),
    ...appColor,
  },
  radius: { sm: 8, md: 14, lg: 22, pill: 999 },
  space: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '5rem',
    '4xl': '8rem',
  },
  ease: {
    out: 'cubic-bezier(0.22, 1, 0.36, 1)',
    in: 'cubic-bezier(0.55, 0, 1, 0.45)',
    inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  },
  duration: { fast: 150, base: 240, slow: 600 },
} as const;

/** The radius tokens as CSS lengths, for `sx`: a bare number there is multiplied by 8px. */
export const radii = {
  sm: `${tokens.radius.sm}px`,
  md: `${tokens.radius.md}px`,
  lg: `${tokens.radius.lg}px`,
  pill: `${tokens.radius.pill}px`,
} as const;

/** The CSS variables of a theme, to set on `:root`. */
export function themeVars(id: ThemeId): Record<string, string> {
  return Object.fromEntries(Object.entries(THEME_COLORS[id]).map(([k, v]) => [cssVar(k), v]));
}

/** A colour at `alpha`; takes a token as well as a hex. */
export const withAlpha = (color: string, alpha: number) =>
  `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`;

/** What every theme shares: scales, and colours outside the themes. */
export const staticTokens = {
  radius: tokens.radius,
  ease: tokens.ease,
  duration: tokens.duration,
  appColor,
} as const;

/**
 * The draft's type sizes that the MUI variants don't already carry. `3xl` is
 * the page title, `xl` the section title.
 */
export const textSize = {
  xs: '0.75rem',
  sm: '0.8125rem',
  md: '0.9375rem',
  lg: '1.125rem',
  xl: '1.375rem',
  '2xl': 'clamp(1.6rem, 1.2vw + 1.2rem, 2.1rem)',
  '3xl': 'clamp(2rem, 2.4vw + 1.2rem, 3rem)',
} as const;

/** `rgba()` from a hex, for the theme: MUI parses some of its colours, and can't read color-mix. */
export function withRgbAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// An app that loads the fonts under other names (next/font) sets these variables.
export const fontDisplay = 'var(--font-display, "Sora"), "Geist", system-ui, sans-serif';
export const fontBody = 'var(--font-body, "Geist"), system-ui, -apple-system, "Segoe UI", sans-serif';
export const fontMono = 'var(--font-mono, "Geist Mono"), ui-monospace, "SFMono-Regular", Menlo, monospace';
export const mono = { fontFamily: fontMono } as const;
