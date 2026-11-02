import { describe, expect, it } from 'vitest';
import { createAtTheme } from './theme';
import { THEME_COLORS, THEME_IDS } from './themes';

describe('createAtTheme', () => {
  it('builds every theme from its own colours', () => {
    for (const id of THEME_IDS) {
      const theme = createAtTheme({ themeId: id });
      expect(theme.palette.primary.main).toBe(THEME_COLORS[id].accent);
      expect(theme.palette.background.default).toBe(THEME_COLORS[id].paper);
    }
  });
  it("sets the variables the tokens read, and the app's own", () => {
    const theme = createAtTheme({ themeId: 'mint', rootVars: { '--app-only': '1' } });
    const baseline = theme.components?.MuiCssBaseline?.styleOverrides as Record<string, Record<string, string>>;
    expect(baseline[':root']?.['--at-paper-2']).toBe(THEME_COLORS.mint.paper2);
    expect(baseline[':root']?.['--app-only']).toBe('1');
  });
});

describe('createAtTheme options', () => {
  it('takes the fonts an app loads under its own names', () => {
    const theme = createAtTheme({ fonts: { display: 'D', body: 'B', mono: 'M' } });
    expect(theme.typography.fontFamily).toBe('B');
    expect(theme.typography.h1.fontFamily).toBe('D');
  });
  it('gives CSS variables on request', () => {
    expect('vars' in createAtTheme({ cssVariables: true })).toBe(true);
    expect('vars' in createAtTheme()).toBe(false);
  });
});
