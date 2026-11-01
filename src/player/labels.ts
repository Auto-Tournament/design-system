/** The player's text. Apps pass their own translations; English otherwise. */
const ENERGY: Record<number, string> = { 3: 'Hype', 2: 'Mid', 1: 'Calm' };

export const DEFAULT_LABELS = {
  play: 'Play',
  pause: 'Pause',
  seek: 'Seek',
  back: 'Back 5 seconds',
  forward: 'Forward 5 seconds',
  mute: 'Mute',
  unmute: 'Unmute',
  volume: 'Volume',
  settings: 'Settings',
  closeSettings: 'Close settings',
  fullscreen: 'Full screen',
  exitFullscreen: 'Exit full screen',
  loading: 'Loading',
  quality: 'Quality',
  auto: 'Auto',
  autoNow: (quality: string) => `Now ${quality}`,
  speed: 'Speed',
  music: 'Music',
  off: 'Off',
  nowPlaying: 'Now playing',
  noMusic: 'No music',
  musicVolume: 'Music volume',
  crowd: 'Crowd',
  evenOut: 'Even out music volume',
  energy: (level: number) => ENERGY[level] ?? '',
};

export type PlayerLabels = typeof DEFAULT_LABELS;
