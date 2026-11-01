/** Remembered player choices; blocked storage just means they aren't remembered. */
export const stored = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const store = (key: string, value: string | null): void => {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked: the pick just isn't remembered.
  }
};

export const storedLevel = (key: string, fallback: number): number => {
  const raw = stored(key);
  const v = Number(raw);
  return raw !== null && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;
};
