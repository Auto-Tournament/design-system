import { describe, expect, it } from 'vitest';
import { byGenre, musicGain, pickTrack } from './music';

const track = (id: string, genre = 'rock', energy?: number) => ({ id, title: id, artist: 'a', genre, energy });

describe('musicGain', () => {
  it('sits at the level between its fades', () => {
    expect(musicGain(30, 60, 0.8)).toBe(0.8);
  });
  it('fades in and out', () => {
    expect(musicGain(0, 60)).toBe(0);
    expect(musicGain(60, 60)).toBe(0);
    expect(musicGain(55, 60, 1, { fadeOut: 10 })).toBe(0.5);
  });
  it('sits lower under the intro, then climbs to the level', () => {
    expect(musicGain(3, 60, 1, { introEnd: 5 })).toBe(0.32);
    expect(musicGain(5.4, 60, 1, { introEnd: 5 })).toBeCloseTo(0.66);
    expect(musicGain(6, 60, 1, { introEnd: 5 })).toBe(1);
  });
});

describe('byGenre', () => {
  it('follows the order, unknown genres last', () => {
    const got = byGenre([track('a', 'zzz'), track('b', 'pop'), track('c', 'rock')], ['rock', 'pop']);
    expect(got.map(([g]) => g)).toEqual(['rock', 'pop', 'zzz']);
  });
});

describe('pickTrack', () => {
  it('takes the asked one', () => {
    expect(pickTrack([track('a'), track('b')], 'b')?.id).toBe('b');
  });
  it('prefers hype when rated', () => {
    expect(pickTrack([track('a', 'rock', 1), track('b', 'rock', 3)])?.id).toBe('b');
  });
  it('has nothing to pick from an empty list', () => {
    expect(pickTrack([])).toBeNull();
  });
});
