import { describe, expect, it } from 'vitest';
import { themeVars, tokens, withAlpha } from './tokens';
import { THEME_COLORS, THEME_IDS } from './themes';

describe('tokens', () => {
  it('falls back to Ember when an app sets no theme', () => {
    expect(tokens.color.paper2).toBe('var(--at-paper2, #18110e)'.replace('paper2', 'paper-2'));
    expect(tokens.color.accent).toBe('var(--at-accent, #ff6a3d)');
  });
  it('gives every theme the variables the tokens read', () => {
    for (const id of THEME_IDS) {
      const vars = themeVars(id);
      for (const [key, value] of Object.entries(tokens.color)) {
        const name = /var\((--[^,]+),/.exec(value)?.[1] ?? '';
        expect(vars[name]).toBe(THEME_COLORS[id][key as keyof (typeof THEME_COLORS)['ember']]);
      }
    }
  });
  it('tints a token', () => {
    expect(withAlpha('#fff', 0.12)).toBe('color-mix(in srgb, #fff 12%, transparent)');
  });
});
