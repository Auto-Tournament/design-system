import { stored } from './storage';

/** A song the player can play under a video. */
export interface PlayerTrack {
  id: string;
  title: string;
  artist: string;
  genre: string;
  /** 3 hype, 2 mid, 1 calm; absent until rated. */
  energy?: number;
}

export const MUSIC_GAIN = 0.5;
const MUSIC_INTRO_GAIN = 0.32;
const MUSIC_FADE_IN = 1.5;

export const MUSIC_OFF_KEY = 'at.reelMusic.off';
export const LAST_TRACK_KEY = 'at.reelMusic.last';

export interface MusicShape {
  /** Where the video's intro ends (0: none); the music sits lower under it. */
  introEnd?: number;
  /** Seconds it fades in over. */
  fadeIn?: number;
  /** Seconds it fades out over, at the end. */
  fadeOut?: number;
}

/** The music's volume `t` seconds into a video `length` long, at the viewer's `level`. */
export function musicGain(
  t: number,
  length: number,
  level = MUSIC_GAIN,
  { introEnd = 0, fadeIn = MUSIC_FADE_IN, fadeOut = 2.5 }: MusicShape = {}
): number {
  let base = level;
  if (introEnd > 0 && t < introEnd) base = MUSIC_INTRO_GAIN;
  else if (introEnd > 0 && t < introEnd + 0.8)
    base = MUSIC_INTRO_GAIN + (level - MUSIC_INTRO_GAIN) * ((t - introEnd) / 0.8);
  const inn = fadeIn > 0 ? Math.min(1, Math.max(0, t / fadeIn)) : 1;
  const out = length > 0 && fadeOut > 0 ? Math.min(1, Math.max(0, (length - t) / fadeOut)) : 1;
  return base * inn * out;
}

/** The tracks under their genres, in `order` (any other genre after). */
export function byGenre<T extends PlayerTrack>(tracks: T[], order: readonly string[]): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const tr of tracks) groups.set(tr.genre, [...(groups.get(tr.genre) ?? []), tr]);
  const rank = (g: string) => (order.includes(g) ? order.indexOf(g) : order.length);
  return [...groups.entries()].sort(([a], [b]) => rank(a) - rank(b));
}

/** `first` if given, else a random hype song when rated, never the one played last (unless it's the only one). */
export function pickTrack<T extends PlayerTrack>(tracks: T[], first?: string): T | null {
  if (!tracks.length || stored(MUSIC_OFF_KEY) === '1') return null;
  const chosen = tracks.find((t) => t.id === first);
  if (chosen) return chosen;
  const last = stored(LAST_TRACK_KEY);
  const hype = tracks.filter((t) => t.energy === 3);
  const from = hype.length ? hype : tracks;
  const pool = from.length > 1 ? from.filter((t) => t.id !== last) : from;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}
