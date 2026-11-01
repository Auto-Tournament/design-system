'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import CircularProgress from '@mui/material/CircularProgress';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import Slider from '@mui/material/Slider';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CheckIcon,
  CornersInIcon,
  CornersOutIcon,
  GaugeIcon,
  GearSixIcon,
  MonitorPlayIcon,
  MusicNotesIcon,
  PauseIcon,
  PlayIcon,
  SpeakerHighIcon,
  SpeakerSlashIcon,
  UsersThreeIcon,
  WaveformIcon,
  XIcon,
} from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { fontMono, tokens, withAlpha } from '../tokens';
import { follow, setEvenOut, setLevel, tapeSpeed, toggleFullscreen, unlock } from './audio';
import {
  byGenre,
  LAST_TRACK_KEY,
  MUSIC_GAIN,
  MUSIC_OFF_KEY,
  musicGain,
  pickTrack,
  type MusicShape,
  type PlayerTrack,
} from './music';
import { store, stored, storedLevel } from './storage';
import { DEFAULT_LABELS, type PlayerLabels } from './labels';
import type React from 'react';

const { color, radius } = tokens;
const mono = { fontFamily: fontMono };

const SPEEDS = [1, 0.5, 0.25] as const;
const SKIP = 5;
/** Controls fade this long after the pointer stops, while playing. */
const IDLE_MS = 2500;

/** One to three bars, lit up to `level`. */
export function EnergyBars({ level, label }: { level: number; label: string }) {
  return (
    <Box
      component="span"
      role="img"
      aria-label={label}
      sx={{ display: 'inline-flex', alignItems: 'flex-end', gap: '2px', flex: 'none' }}
    >
      {[6, 9, 12].map((h, i) => (
        <Box
          key={h}
          component="span"
          sx={{
            width: 3,
            height: h,
            borderRadius: '1px',
            bgcolor: i < level ? color.accent : withAlpha(color.ink, 0.25),
          }}
        />
      ))}
    </Box>
  );
}

/** One chapter of a video, as the scrubber's hover card shows it. */
export interface ChapterInfo {
  title: string;
  sub: string;
  /** A still to show (an image). */
  thumb?: string;
}

/** Seconds one song crossfades into the next, once the next can play. */
const CROSSFADE = 1;

const LAST_TRACK = LAST_TRACK_KEY;
const MUSIC_OFF = MUSIC_OFF_KEY;
const CROWD_OFF = 'at.reelCrowd.off';
const EVEN_OUT_OFF = 'at.reelMusic.evenOutOff';
const VOLUME = 'at.player.volume';
const MUTED = 'at.player.muted';
const MUSIC_LEVEL = 'at.reelMusic.level2';

const clock = (s: number) => {
  const t = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

export interface PlayerHandle {
  seek: (seconds: number) => void;
  play: () => void;
}

export interface PlayerProps<T extends PlayerTrack = PlayerTrack> {
  src: string;
  /** What it is, for screen readers. */
  label: string;
  poster?: string;
  /** A reel's chapter starts, drawn as gaps in the track. */
  chapterStarts?: number[];
  /** What each chapter is (in chapterStarts' order), shown when the scrubber is hovered. */
  chapterInfo?: ChapterInfo[];
  /** Songs to play beside the video. */
  tracks?: T[];
  /** A song's audio file for this video. */
  trackSrc?: (track: T) => string;
  /** The order genres are listed in, and how they're named. */
  genreOrder?: readonly string[];
  genreLabel?: (genre: string) => string;
  /** The music's fades and intro. */
  musicShape?: MusicShape;
  /** A crowd track, played beside it unless turned off. */
  crowd?: string | null;
  /** The song playing changed (for its credit, or a share link). */
  onSong?: (track: T | null) => void;
  /** The viewer's music level changed. */
  onMusicLevel?: (level: number) => void;
  /** The song it starts with (a track id); else a random one. */
  defaultTrack?: string;
  /** Start playing as soon as it mounts. */
  autoPlay?: boolean;
  /** The video's versions, biggest first; `src` is the one Auto picked. A menu when there are two or more. */
  qualities?: { label: string; src: string }[];
  /** More on the scrubber (a clip's kills): `at` turns seconds into a position. */
  marks?: (at: (seconds: number) => string) => ReactNode;
  /** What's at this point of the scrubber, when no chapter says. */
  hoverNote?: (seconds: number) => string;
  /** A chapter's still, instead of an image from its `thumb`. */
  renderThumb?: (thumb: string) => ReactNode;
  /** More buttons (share, download), before the settings. */
  controls?: ReactNode;
  /** A known length, until the video's own has loaded. */
  duration?: number;
  onTime?: (seconds: number) => void;
  /** The player's text; English unless given. */
  labels?: Partial<PlayerLabels>;
  'data-testid'?: string;
}

const ctl = {
  width: 44,
  height: 44,
  borderRadius: '12px',
  color: '#f4edeb',
  '&:hover': { bgcolor: 'rgba(244,237,235,0.12)' },
  '&.Mui-focusVisible': { outline: `2px solid ${color.accent}`, outlineOffset: 2 },
} as const;

/**
 * A scrubber with each chapter marked, play, ±5 s, volume, the time, speed
 * (1×, 0.5×, 0.25×), the crowd, the music and full screen. Space or K plays,
 * J and L (or the arrows) skip, M mutes, F goes full screen, N plays the next song.
 */
/**
 * The settings menu's pages: the new page pushes the old one out sideways
 * (deeper from the right, back from the left), then the menu eases to the
 * new page's height.
 */
const PAGE_DEPTH: Record<string, number> = { main: 0, genre: 2 };
/** Seconds a menu page takes to push the other out. */
const SLIDE = 0.55;
/** The settings menu's height on every page (less on a smaller player), so it never jumps. */
const MENU_HEIGHT = 320;

function SettingsPages({ page, children }: { page: string; children: ReactNode }) {
  // Deeper slides in from the right, back up from the left.
  const last = useRef(page);
  const dir = useRef(1);
  if (last.current !== page) {
    dir.current = (PAGE_DEPTH[page] ?? 1) < (PAGE_DEPTH[last.current] ?? 1) ? -1 : 1;
    last.current = page;
  }
  // Focus the page's first row without scrolling to it: a focus scroll mid-slide would snap the page into place.
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.querySelector<HTMLElement>(`[data-page="${page}"] [role^="menuitem"]`)?.focus({ preventScroll: true });
  }, [page]);
  return (
    <div ref={box} style={{ position: 'relative', height: MENU_HEIGHT, flex: '0 1 auto', minHeight: 0, overflow: 'clip' }}>
      <AnimatePresence initial={false} custom={dir.current}>
        <motion.div
          key={page}
          data-page={page}
          custom={dir.current}
          variants={{ in: (d: number) => ({ x: `${d * 100}%` }), out: (d: number) => ({ x: `${d * -100}%` }) }}
          initial="in"
          animate={{ x: 0 }}
          exit="out"
          transition={{ duration: SLIDE, ease: [0.32, 0.72, 0, 1] }}
          // contain: scrolling past a list's end doesn't scroll the page behind it.
          style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain' }}
        >
          <MenuList sx={{ py: 0.75 }}>{children}</MenuList>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function PlayerInner<T extends PlayerTrack>(
  {
    src,
    label,
    poster,
    chapterStarts = [],
    chapterInfo = [],
    tracks = [],
    trackSrc,
    genreOrder = [],
    genreLabel = (g) => g,
    musicShape,
    crowd = null,
    onSong,
    onMusicLevel,
    qualities = [],
    defaultTrack,
    autoPlay = false,
    marks,
    hoverNote,
    renderThumb,
    controls,
    duration: knownDuration = 0,
    onTime,
    labels,
    'data-testid': testId,
  }: PlayerProps<T>,
  ref: React.ForwardedRef<PlayerHandle>
) {
  const l = { ...DEFAULT_LABELS, ...labels };
  const songSrc = (t: T | null | undefined) => (t ? (trackSrc ? trackSrc(t) : (t as T & { src?: string }).src) : undefined);
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  // The quality: Auto (`src`, picked for this screen) or one of the reel's versions.
  const [pick, setPick] = useState('auto');
  const resumeAt = useRef<{ at: number; play: boolean } | null>(null);
  // Auto starts at `src` and drops a step each time playback stalls on a slow connection.
  const [autoSrc, setAutoSrc] = useState(src);
  useEffect(() => setAutoSrc(src), [src]);
  const source = pick === 'auto' ? autoSrc : pick;
  const autoLabel = qualities.find((q) => q.src === autoSrc)?.label;
  const pickQuality = (next: string) => {
    setPage('main');
    const v = video.current;
    // Only a new file reloads (and so resumes); the same one keeps playing.
    if (v && (next === 'auto' ? autoSrc : next) !== source) resumeAt.current = { at: v.currentTime, play: !v.paused };
    setPick(next);
  };
  // A stall is the video still waiting 2.5 s into playing (not the short wait after a seek or a start).
  const stall = useRef<number | undefined>(undefined);
  const calm = () => window.clearTimeout(stall.current);
  const track = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  // Waiting for data while playing (a new quality loading, or a slow line): a spinner over the video.
  const [buffering, setBuffering] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(knownDuration);
  const [muted, setMuted] = useState(false);
  // The overall level: the game's sound, the crowd and the music together.
  const [volume, setVolume] = useState(1);
  const volumeRef = useRef(volume);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [full, setFull] = useState(false);
  const [idle, setIdle] = useState(false);
  const idleTimer = useRef<number | undefined>(undefined);
  // Two music players, so a new song fades in over the old one: `live` is the one heard (or fading in).
  const decks = [useRef<HTMLAudioElement>(null), useRef<HTMLAudioElement>(null)] as const;
  const [mix, setMix] = useState<{ songs: (T | null)[]; live: number }>({ songs: [null, null], live: 0 });
  const mixRef = useRef(mix);
  mixRef.current = mix;
  const fades = useRef([0, 0]);
  const crowdAudio = useRef<HTMLAudioElement>(null);
  const [crowdOn, setCrowdOn] = useState(true);
  const [even, setEven] = useState(true);
  useEffect(() => setEvenOut(even), [even]);
  const [song, setSong] = useState<T | null>(null);
  const [musicLevel, setMusicLevel] = useState(MUSIC_GAIN);
  const musicLevelRef = useRef(musicLevel);
  musicLevelRef.current = musicLevel;
  // One settings menu (a sheet from the bottom on a phone): its main page or one of its lists.
  const [settings, setSettings] = useState(false);
  const [page, setPage] = useState<'main' | 'quality' | 'speed' | 'music' | 'genre'>('main');
  const [genre, setGenre] = useState('');
  const cog = useRef<HTMLButtonElement>(null);
  const sheet = useMediaQuery('(hover: none) and (pointer: coarse)');

  // What the viewer chose last time, read after hydration (the server has no storage).
  useEffect(() => {
    setVolume(storedLevel(VOLUME, 1));
    setMuted(stored(MUTED) === '1');
    setCrowdOn(stored(CROWD_OFF) !== '1');
    setEven(stored(EVEN_OUT_OFF) !== '1');
    setMusicLevel(storedLevel(MUSIC_LEVEL, MUSIC_GAIN));
  }, []);

  const trackKey = tracks.map((t) => t.id).join(',');
  useEffect(() => {
    setSong(pickTrack(tracks, defaultTrack));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- trackKey is tracks' identity
  }, [trackKey, src]);
  const toggleMute = () =>
    setMuted((m) => {
      store(MUTED, m ? null : '1');
      return !m;
    });
  useEffect(() => {
    if (song) store(LAST_TRACK, song.id);
    onSong?.(song);
  }, [song, onSong]);

  const chooseTrack = (next: T | null) => {
    store(MUSIC_OFF, next ? null : '1');
    // From the tap: load the next song on the other player and let it play (phones need the tap).
    const i = 1 - mixRef.current.live;
    const a = decks[i]!.current;
    if (a && next && next.id !== song?.id) {
      // Silent until its fade starts: no full-volume burst from the tap's play().
      fades.current[i] = 0;
      a.src = songSrc(next) ?? '';
      unlock([a], video.current);
      setLevel(a, 0);
    }
    setSong(next);
  };
  const toggleEven = () =>
    setEven((on) => {
      store(EVEN_OUT_OFF, on ? '1' : null);
      return !on;
    });
  const toggleCrowd = () =>
    setCrowdOn((on) => {
      store(CROWD_OFF, on ? '1' : null);
      return !on;
    });

  // A new song goes on the other player and becomes the live one.
  useEffect(() => {
    setMix((m) => (m.songs[m.live]?.id === song?.id ? m : { songs: m.live ? [song, m.songs[1]!] : [m.songs[0]!, song], live: 1 - m.live }));
  }, [song]);
  const followDeck = (i: number) => {
    const v = video.current;
    const a = decks[i]!.current;
    if (!v || !a || !mix.songs[i]) return;
    let last = performance.now();
    return follow(v, a, () => {
      const now = performance.now();
      const step = Math.min(0.1, (now - last) / 1000) / CROSSFADE;
      last = now;
      // The live song fades in once it can play; the other one fades out then, not before.
      const m = mixRef.current;
      const ready = !m.songs[m.live] || (decks[m.live]!.current?.readyState ?? 0) >= 3;
      const target = i === m.live ? (ready ? 1 : 0) : ready ? 0 : 1;
      const f = fades.current;
      f[i] = f[i]! + Math.max(-step, Math.min(step, target - f[i]!));
      // Faded out: stop it (it starts again with the video only if it is live).
      if (f[i] === 0 && i !== m.live && !a.paused) a.pause();
      return f[i]! * volumeRef.current * musicGain(v.currentTime, v.duration || 0, musicLevelRef.current, musicShape);
    });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- each player follows while it holds a song
  useEffect(() => followDeck(0), [mix.songs[0]]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- each player follows while it holds a song
  useEffect(() => followDeck(1), [mix.songs[1]]);
  useEffect(() => {
    const v = video.current;
    const a = crowdAudio.current;
    if (!v || !a || !crowd) return;
    if (!crowdOn) {
      a.pause();
      return;
    }
    return follow(v, a, () => volumeRef.current);
  }, [crowd, crowdOn]);

  const play = useCallback(() => {
    // From the tap itself: the music and crowd start too (phones need it).
    unlock([decks[0].current, decks[1].current, crowdAudio.current], video.current);
    void video.current?.play().catch(() => {
      decks[0].current?.pause();
      decks[1].current?.pause();
      crowdAudio.current?.pause();
    });
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  useEffect(() => void (autoPlay && play()), []);
  const toggle = useCallback(() => {
    const v = video.current;
    if (!v) return;
    if (v.paused) play();
    else v.pause();
  }, [play]);
  const seek = useCallback((s: number) => {
    const v = video.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(s, (v.duration || s) - 0.01));
    // Mid-reload (another quality): carry on from here, not from where the reload began.
    if (resumeAt.current) resumeAt.current.at = v.currentTime;
    setTime(v.currentTime);
  }, []);

  useImperativeHandle(ref, () => ({ seek, play }), [seek, play]);

  const wake = useCallback(() => {
    setIdle(false);
    window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setIdle(true), IDLE_MS);
  }, []);
  useEffect(
    () => () => {
      window.clearTimeout(idleTimer.current);
      window.clearTimeout(stall.current);
    },
    [],
  );

  useEffect(() => {
    const onFull = () => setFull(document.fullscreenElement === box.current);
    document.addEventListener('fullscreenchange', onFull);
    return () => document.removeEventListener('fullscreenchange', onFull);
  }, []);

  useEffect(() => {
    if (video.current) tapeSpeed(video.current, speed);
  }, [speed]);

  useEffect(() => {
    volumeRef.current = volume;
    if (video.current) video.current.volume = volume;
  }, [volume]);

  const fullscreen = () => toggleFullscreen(box.current, video.current);

  // F works anywhere on the page unless the viewer is typing. With several players, the one playing takes it.
  useEffect(() => {
    const onPageKey = (e: globalThis.KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'f' || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (target && box.current?.contains(target)) return; // onKey has it
      const others = document.querySelectorAll('[data-at-player]').length > 1;
      if (others && video.current?.paused !== false) return;
      e.preventDefault();
      toggleFullscreen(box.current, video.current);
    };
    document.addEventListener('keydown', onPageKey);
    return () => document.removeEventListener('keydown', onPageKey);
  }, []);

  const [hover, setHover] = useState<{ x: number; width: number; time: number } | null>(null);
  const hoverAt = (e: PointerEvent) => {
    const r = track.current?.getBoundingClientRect();
    if (!r || !duration) return;
    const x = Math.max(0, Math.min(r.width, e.clientX - r.left));
    setHover({ x, width: r.width, time: (x / r.width) * duration });
  };
  const fromPointer = (e: PointerEvent) => {
    const r = track.current?.getBoundingClientRect();
    if (!r || !duration) return;
    seek(((e.clientX - r.left) / r.width) * duration);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    const v = video.current;
    if (!v) return;
    if (k === ' ' || k === 'k') toggle();
    else if (k === 'j' || k === 'arrowleft') seek(v.currentTime - SKIP);
    else if (k === 'l' || k === 'arrowright') seek(v.currentTime + SKIP);
    else if (k === 'm') toggleMute();
    else if (k === 'f') fullscreen();
    else if (k === 'n' && tracks.length > 1) chooseTrack(tracks[(tracks.findIndex((t) => t.id === song?.id) + 1) % tracks.length]!);
    else return;
    e.preventDefault();
    wake();
  };

  const pct = (s: number) => `${duration ? Math.min(100, (s / duration) * 100) : 0}%`;
  const hidden = playing && idle && !settings;

  const settingRow = (label: string, value: string, icon: ReactNode, next: typeof page) => (
    <MenuItem key={label} onClick={() => setPage(next)}>
      <ListItemIcon>{icon}</ListItemIcon>
      <ListItemText primary={label} />
      <Box component="span" sx={{ ml: 2, mr: 0.5, color: color.ink2, fontSize: '0.8125rem', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value}
      </Box>
      <CaretRightIcon size={14} />
    </MenuItem>
  );
  const backRow = (label: string, to: typeof page = 'main', count?: number) => (
    <MenuItem
      key="back"
      onClick={() => setPage(to)}
      sx={{ fontWeight: 600, borderBottom: `1px solid ${color.rule}`, position: 'sticky', top: 0, zIndex: 1, bgcolor: color.paper2, '&:hover': { bgcolor: color.paper3 } }}
    >
      <ListItemIcon>
        <CaretLeftIcon size={16} />
      </ListItemIcon>
      <Box component="span" sx={{ flex: 1 }}>
        {label}
      </Box>
      {count !== undefined && (
        <Box component="span" sx={{ ...mono, fontWeight: 400, fontSize: '0.8125rem', color: color.ink2 }}>
          {count}
        </Box>
      )}
    </MenuItem>
  );
  const picked = (on: boolean) => <ListItemIcon>{on && <CheckIcon size={16} />}</ListItemIcon>;
  // At the menu's foot on every page (so the menu keeps one height), in view while the songs scroll.
  const musicLevelBar = tracks.length > 0 && (
    <Box
      sx={{
        px: 2,
        py: 1.25,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        flex: 'none',
        bgcolor: color.paper2,
        borderTop: `1px solid ${color.rule}`,
      }}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Typography variant="caption" sx={{ flex: 'none', color: color.ink2 }}>
        {l.musicVolume}
      </Typography>
      <Slider
        size="small"
        min={0}
        max={1}
        step={0.05}
        value={musicLevel}
        onChange={(_, v) => setMusicLevel(v as number)}
        onChangeCommitted={(_, v) => {
          store(MUSIC_LEVEL, String(v));
          onMusicLevel?.(v as number);
        }}
        aria-label={l.musicVolume}
        valueLabelDisplay="auto"
        valueLabelFormat={(v) => `${Math.round(v * 100)}%`}
      />
    </Box>
  );
  // The menu's rows as a flat list (a Menu moves focus through its direct children).
  const settingsItems = () => {
    if (page === 'quality')
      return [
        backRow(l.quality),
        <MenuItem key="auto" selected={pick === 'auto'} onClick={() => pickQuality('auto')}>
          {picked(pick === 'auto')}
          <ListItemText primary={l.auto} secondary={autoLabel && l.autoNow(autoLabel)} />
        </MenuItem>,
        ...qualities.map((q) => (
          <MenuItem key={q.src} selected={pick === q.src} onClick={() => pickQuality(q.src)}>
            {picked(pick === q.src)}
            <ListItemText primary={q.label} />
          </MenuItem>
        )),
      ];
    if (page === 'speed')
      return [
        backRow(l.speed),
        ...SPEEDS.map((v) => (
          <MenuItem
            key={v}
            selected={speed === v}
            onClick={() => {
              setSpeed(v);
              setPage('main');
            }}
          >
            {picked(speed === v)}
            <ListItemText primary={`${v}×`} />
          </MenuItem>
        )),
      ];
    if (page === 'music')
      return [
        backRow(l.music),
        song && (
          <Box key="now" sx={{ px: 2, pt: 1.25, pb: 0.75, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <Typography variant="caption" sx={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: color.muted }}>
              {l.nowPlaying}
            </Typography>
            <Typography variant="body2" noWrap>
              {song.title}
            </Typography>
            <Typography variant="caption" noWrap sx={{ color: color.ink2 }}>
              {song.artist}
            </Typography>
          </Box>
        ),
            <MenuItem key="none" selected={!song} onClick={() => chooseTrack(null)}>
              <ListItemIcon>{!song && <CheckIcon size={16} />}</ListItemIcon>
              <ListItemText primary={l.noMusic} />
            </MenuItem>,
            <Divider key="rule" />,
            ...byGenre(tracks, genreOrder).map(([g, list]) => (
              <MenuItem
                key={g}
                onClick={() => {
                  setGenre(g);
                  setPage('genre');
                }}
              >
                <ListItemIcon>{list.some((tr) => tr.id === song?.id) && <Box component="span" sx={{ width: 6, height: 6, ml: 0.5, borderRadius: '50%', bgcolor: color.accent }} />}</ListItemIcon>
                <ListItemText primary={genreLabel(g)} />
                <Box component="span" sx={{ ...mono, ml: 2, mr: 0.5, fontSize: '0.8125rem', color: color.ink2 }}>
                  {list.length}
                </Box>
                <CaretRightIcon size={14} />
              </MenuItem>
            )),
      ];
    if (page === 'genre') {
      const list = tracks.filter((tr) => tr.genre === genre);
      // Hype, mid, then calm, each under its own heading (when the songs are rated).
      const levels = [3, 2, 1].filter((e) => list.some((tr) => tr.energy === e));
      const row = (tr: T) => (
          <MenuItem
            key={tr.id}
            selected={tr.id === song?.id}
            onClick={() => chooseTrack(tr)}
            // The highlight moves with the crossfade: fading in on the new song, out on the old.
            sx={{ transition: `background-color ${CROSSFADE}s linear` }}
          >
            {picked(tr.id === song?.id)}
            <ListItemText primary={tr.title} secondary={tr.artist} slotProps={{ primary: { noWrap: true }, secondary: { noWrap: true } }} />
            {tr.energy && <EnergyBars level={tr.energy} label={l.energy(tr.energy)} />}
          </MenuItem>
      );
      return [
        backRow(genreLabel(genre), 'music', list.length),
        ...(levels.length === 0
          ? list.map(row)
          : levels.flatMap((e) => [
              <Box
                key={`energy-${e}`}
                sx={{
                  px: 2,
                  pt: 1.25,
                  pb: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: color.muted,
                }}
              >
                <EnergyBars level={e} label={l.energy(e)} />
                {l.energy(e)}
              </Box>,
              ...list.filter((tr) => tr.energy === e).map(row),
            ])),
        // Not rated yet (added without running the script): still listed, last.
        ...(levels.length ? list.filter((tr) => !tr.energy).map(row) : []),
      ];
    }
    const qualityName = pick === 'auto' ? `${l.auto}${autoLabel ? ` · ${autoLabel.split(' ·')[0]}` : ''}` : (qualities.find((q) => q.src === pick)?.label ?? '');
    return [
      qualities.length > 1 && settingRow(l.quality, qualityName, <MonitorPlayIcon size={20} />, 'quality'),
      settingRow(l.speed, `${speed}×`, <GaugeIcon size={20} />, 'speed'),
      tracks.length > 0 && settingRow(l.music, song?.title ?? l.off, <MusicNotesIcon size={20} />, 'music'),
      crowd && (
        <MenuItem key="crowd" role="menuitemcheckbox" aria-checked={crowdOn} onClick={toggleCrowd}>
          <ListItemIcon>
            <UsersThreeIcon size={20} />
          </ListItemIcon>
          <ListItemText primary={l.crowd} />
          <Switch size="small" checked={crowdOn} tabIndex={-1} sx={{ ml: 2, pointerEvents: 'none' }} slotProps={{ input: { 'aria-hidden': true } }} />
        </MenuItem>
      ),
      tracks.length > 0 && (
        <MenuItem key="even" role="menuitemcheckbox" aria-checked={even} onClick={toggleEven}>
          <ListItemIcon>
            <WaveformIcon size={20} />
          </ListItemIcon>
          <ListItemText primary={l.evenOut} />
          <Switch size="small" checked={even} tabIndex={-1} sx={{ ml: 2, pointerEvents: 'none' }} slotProps={{ input: { 'aria-hidden': true } }} />
        </MenuItem>
      ),
    ].filter(Boolean);
  };

  return (
    <Box
      ref={box}
      tabIndex={0}
      role="group"
      aria-label={label}
      onKeyDown={onKey}
      onPointerMove={wake}
      data-at-player=""
      data-testid={testId}
      sx={{
        position: 'relative',
        borderRadius: full ? 0 : `${radius.lg}px`,
        overflow: 'hidden',
        aspectRatio: full ? undefined : '16 / 9',
        maxWidth: '100%',
        height: full ? '100%' : undefined,
        bgcolor: '#000',
        border: full ? 'none' : `1px solid ${color.rule}`,
        cursor: hidden ? 'none' : 'default',
        '&:focus-visible': { outline: `2px solid ${color.accent}`, outlineOffset: 2 },
      }}
    >
      <Box
        component="video"
        ref={video}
        src={source}
        poster={poster}
        playsInline
        muted={muted}
        preload="metadata"
        // With the settings open, a click on the video only closes them.
        onClick={() => (settings ? setSettings(false) : toggle())}
        onPlay={() => {
          setPlaying(true);
          wake();
        }}
        onPause={() => {
          calm();
          setPlaying(false);
        }}
        onEnded={() => setPlaying(false)}
        onWaiting={(e) => {
          setBuffering(true);
          const v = e.currentTarget;
          const lower = qualities[qualities.findIndex((q) => q.src === autoSrc) + 1];
          if (pick !== 'auto' || !lower) return;
          calm();
          stall.current = window.setTimeout(() => {
            // Still not playing: the connection can't keep up, so a step down.
            if (v.paused || v.seeking || v.readyState > 2 || resumeAt.current) return;
            resumeAt.current = { at: v.currentTime, play: true };
            setAutoSrc(lower.src);
          }, 2500);
        }}
        onPlaying={() => {
          calm();
          setBuffering(false);
        }}
        onLoadStart={() => resumeAt.current?.play && setBuffering(true)}
        onCanPlay={() => video.current?.paused && setBuffering(false)}
        onSeeking={calm}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration || knownDuration);
          // Another quality: on from the same moment, playing if it was.
          const r = resumeAt.current;
          if (!r) return;
          resumeAt.current = null;
          e.currentTarget.currentTime = r.at;
          if (r.play) void e.currentTarget.play();
        }}
        onTimeUpdate={(e) => {
          setTime(e.currentTarget.currentTime);
          onTime?.(e.currentTarget.currentTime);
        }}
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', // cover: the 1 px border leaves the box a hair wider than 16:9, which showed as thin bars at the sides.
          objectFit: full ? 'contain' : 'cover', display: 'block' }}
      />
      {/* Kept mounted while off: a phone lets a sound play from code only once
          a tap has started it, and a new element would have to wait for the next. */}
      {tracks.length > 0 && decks.map((d, i) => <audio key={i} ref={d} src={songSrc(mix.songs[i])} preload="auto" muted={muted} data-music="1" />)}
      {crowd && <audio ref={crowdAudio} src={crowd} preload="auto" muted={muted} />}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'linear-gradient(180deg, rgba(0,0,0,0) 62%, rgba(0,0,0,0.78) 100%)',
          opacity: hidden ? 0 : 1,
          transition: 'opacity 200ms',
        }}
      />

      {buffering && playing && (
        <CircularProgress
          aria-label={l.loading}
          size={56}
          thickness={3}
          sx={{ position: 'absolute', left: '50%', top: '46%', mt: '-28px', ml: '-28px', color: color.accent, pointerEvents: 'none' }}
        />
      )}
      {!playing && (
        <ButtonBase
          onClick={toggle}
          aria-label={l.play}
          sx={{
            position: 'absolute',
            left: '50%',
            top: '46%',
            width: { xs: 64, sm: 96 },
            height: { xs: 64, sm: 96 },
            transform: 'translate(-50%, -50%)',
            borderRadius: `${radius.pill}px`,
            bgcolor: color.accent,
            color: color.accentInk,
            transition: 'transform 150ms',
            '&:hover': { transform: 'translate(-50%, -50%) scale(1.06)' },
            '&.Mui-focusVisible': { outline: `2px solid ${color.ink}`, outlineOffset: 3 },
          }}
        >
          <PlayIcon size={34} weight="fill" />
        </ButtonBase>
      )}

      <Box
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          px: { xs: 1, sm: 2 },
          pb: { xs: 0.5, sm: 1.5 },
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          opacity: hidden ? 0 : 1,
          transition: 'opacity 200ms',
        }}
      >
        <Box
          ref={track}
          role="slider"
          tabIndex={0}
          aria-label={l.seek}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(time)}
          aria-valuetext={`${clock(time)} / ${clock(duration)}`}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            fromPointer(e);
          }}
          onPointerMove={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) fromPointer(e);
            if (e.pointerType === 'mouse') hoverAt(e);
          }}
          onPointerLeave={() => setHover(null)}
          sx={{
            position: 'relative',
            height: 28,
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            touchAction: 'none',
            '&:focus-visible': { outline: `2px solid ${color.accent}`, outlineOffset: 2, borderRadius: 1 },
          }}
        >
          <Box sx={{ position: 'absolute', left: 0, right: 0, height: 5, borderRadius: 999, bgcolor: 'rgba(244,237,235,0.22)' }} />
          <Box sx={{ position: 'absolute', left: 0, width: pct(time), height: 5, borderRadius: 999, bgcolor: color.accent }} />
          {hover &&
            (() => {
              let chapter = -1;
              chapterStarts.forEach((s, i) => {
                if (s <= hover.time + 0.05) chapter = i;
              });
              const info = chapter >= 0 ? chapterInfo[chapter] : undefined;
              const w = info?.thumb ? 208 : 150;
              return (
                <Box
                  role="tooltip"
                  sx={{
                    position: 'absolute',
                    bottom: 30,
                    left: Math.max(0, Math.min(hover.width - w, hover.x - w / 2)),
                    width: w,
                    p: 0.75,
                    borderRadius: '12px',
                    bgcolor: 'rgba(18,16,15,0.92)',
                    border: '1px solid rgba(244,237,235,0.14)',
                    color: '#f4edeb',
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
                  }}
                >
                  {info?.thumb && (
                    renderThumb ? (
                      <Box sx={{ position: 'relative', aspectRatio: '16 / 9', borderRadius: '8px', overflow: 'hidden', bgcolor: '#000' }}>{renderThumb(info.thumb)}</Box>
                    ) : (
                      <Box component="img" src={info.thumb} alt="" sx={{ display: 'block', width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: '8px', bgcolor: '#000' }} />
                    )
                  )}
                  {info && <Box sx={{ fontWeight: 600, fontSize: '0.8125rem', lineHeight: 1.3, overflowWrap: 'anywhere' }}>{info.title}</Box>}
                  <Box sx={{ fontSize: '0.75rem', color: '#c4bcb9', display: 'flex', gap: 0.75, justifyContent: 'space-between' }}>
                    <span>{info?.sub ?? hoverNote?.(hover.time) ?? ''}</span>
                    <Box component="span" sx={{ ...mono, whiteSpace: 'nowrap' }}>
                      {clock(hover.time)}
                    </Box>
                  </Box>
                </Box>
              );
            })()}
          {chapterStarts
            .filter((s) => s > 0)
            .map((s) => (
              <Box key={s} sx={{ position: 'absolute', left: pct(s), width: 3, ml: '-1.5px', height: 9, bgcolor: '#000' }} />
            ))}
          {marks?.(pct)}
          <Box
            sx={{
              position: 'absolute',
              left: pct(time),
              width: 16,
              height: 16,
              ml: '-8px',
              borderRadius: 999,
              bgcolor: '#f4edeb',
              boxShadow: `0 0 0 4px ${withAlpha(color.accent, 0.35)}`,
              pointerEvents: 'none',
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0, sm: 0.5 } }}>
          <ButtonBase onClick={toggle} aria-label={playing ? l.pause : l.play} sx={ctl}>
            {playing ? <PauseIcon size={22} weight="fill" /> : <PlayIcon size={22} weight="fill" />}
          </ButtonBase>
          <ButtonBase onClick={() => seek(time - SKIP)} aria-label={l.back} sx={{ ...ctl, display: { xs: 'none', sm: 'inline-flex' } }}>
            <ArrowCounterClockwiseIcon size={20} />
          </ButtonBase>
          <ButtonBase onClick={() => seek(time + SKIP)} aria-label={l.forward} sx={{ ...ctl, display: { xs: 'none', sm: 'inline-flex' } }}>
            <ArrowClockwiseIcon size={20} />
          </ButtonBase>
          <ButtonBase onClick={toggleMute} aria-label={muted ? l.unmute : l.mute} sx={ctl}>
            {muted || volume === 0 ? <SpeakerSlashIcon size={20} /> : <SpeakerHighIcon size={20} />}
          </ButtonBase>
          <Slider
            size="small"
            min={0}
            max={1}
            step={0.02}
            value={muted ? 0 : volume}
            onChange={(_, v) => {
              setVolume(v as number);
              if (muted && (v as number) > 0) setMuted(false);
            }}
            onChangeCommitted={(_, v) => store(VOLUME, String(v))}
            aria-label={l.volume}
            sx={{ width: 72, mx: 1, color: '#f4edeb', display: { xs: 'none', sm: 'inline-flex' }, '& .MuiSlider-thumb': { width: 12, height: 12 } }}
          />
          <Box component="span" sx={{ ...mono, fontSize: '0.8125rem', color: '#c4bcb9', ml: 0.75, whiteSpace: 'nowrap' }}>
            {clock(time)} / {clock(duration)}
          </Box>
          <Box sx={{ flex: 1 }} />
          {controls}
          <ButtonBase
            ref={cog}
            onClick={() => {
              setPage('main');
              setSettings((o) => !o);
            }}
            aria-label={l.settings}
            aria-haspopup="menu"
            aria-expanded={!!settings}
            sx={ctl}
          >
            <GearSixIcon size={20} weight={settings ? 'fill' : 'regular'} />
          </ButtonBase>
          <ButtonBase onClick={fullscreen} aria-label={full ? l.exitFullscreen : l.fullscreen} sx={ctl}>
            {full ? <CornersInIcon size={20} /> : <CornersOutIcon size={20} />}
          </ButtonBase>
        </Box>
      </Box>

      {sheet ? (
        <Drawer
          anchor="bottom"
          open={settings}
          onClose={() => setSettings(false)}
          container={full ? box.current : undefined}
          slotProps={{ paper: { sx: { bgcolor: color.paper2, borderRadius: `${radius.lg}px ${radius.lg}px 0 0`, maxHeight: '75vh', pb: 2 } } }}
        >
          <SettingsPages page={page}>{settingsItems()}</SettingsPages>
          {musicLevelBar}
        </Drawer>
      ) : (
        <AnimatePresence>
          {settings && (
            <ClickAwayListener onClickAway={(e) => !cog.current?.contains(e.target as Node) && setSettings(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                // The player's own keys (space, arrows) stay out of the menu.
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Escape') {
                    setSettings(false);
                    cog.current?.focus();
                  }
                }}
                style={{
                  position: 'absolute',
                  right: 16,
                  bottom: 84,
                  zIndex: 3,
                  width: 300,
                  maxHeight: 'calc(100% - 100px)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'clip',
                  transformOrigin: 'bottom right',
                  background: color.paper2,
                  border: `1px solid ${color.rule}`,
                  borderRadius: radius.md,
                  boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', flex: 'none', height: 40, pl: 2, pr: 0.75, borderBottom: `1px solid ${color.rule}` }}>
                  <Typography component="span" sx={{ flex: 1, fontSize: '0.8125rem', color: color.ink2 }}>
                    {l.settings}
                  </Typography>
                  <ButtonBase
                    onClick={() => {
                      setSettings(false);
                      cog.current?.focus();
                    }}
                    aria-label={l.closeSettings}
                    sx={{ width: 30, height: 30, borderRadius: '50%', color: color.ink2, '&:hover': { color: color.ink, bgcolor: color.paper3 } }}
                  >
                    <XIcon size={16} />
                  </ButtonBase>
                </Box>
                <SettingsPages page={page}>{settingsItems()}</SettingsPages>
                {musicLevelBar}
              </motion.div>
            </ClickAwayListener>
          )}
        </AnimatePresence>
      )}
    </Box>
  );
}

/** Our video player. Generic over the song type, which forwardRef can't express. */
export const Player = forwardRef(PlayerInner) as <T extends PlayerTrack = PlayerTrack>(
  props: PlayerProps<T> & { ref?: React.Ref<PlayerHandle> }
) => ReactNode;
