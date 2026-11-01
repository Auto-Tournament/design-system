/**
 * Auto Tournament design tokens. Colours are CSS variables, so a theme can be
 * swapped at runtime (`themeVars`), with Ember as the fallback when an app sets none.
 */
import { DEFAULT_THEME_ID, THEME_COLORS, type ThemeColorOverrides, type ThemeId } from './themes';

export type ColorKey = keyof ThemeColorOverrides;

const cssVar = (key: string) => `--at-${key.replace(/[A-Z0-9]/g, (c) => `-${c.toLowerCase()}`)}`;
const ember = THEME_COLORS[DEFAULT_THEME_ID];

export const tokens = {
  color: Object.fromEntries(
    Object.entries(ember).map(([k, v]) => [k, `var(${cssVar(k)}, ${v})`])
  ) as Record<ColorKey, string>,
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

/** The CSS variables of a theme, to set on `:root`. */
export function themeVars(id: ThemeId): Record<string, string> {
  return Object.fromEntries(Object.entries(THEME_COLORS[id]).map(([k, v]) => [cssVar(k), v]));
}

/** A colour at `alpha`; takes a token as well as a hex. */
export const withAlpha = (color: string, alpha: number) =>
  `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`;

export const fontDisplay = '"Sora", "Geist", system-ui, sans-serif';
export const fontBody = '"Geist", system-ui, -apple-system, "Segoe UI", sans-serif';
export const fontMono = '"Geist Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';
export const mono = { fontFamily: fontMono } as const;
