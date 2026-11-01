/** The sounds beside the video: music and crowd, in step with it. */

let audioCtx: AudioContext | null = null;
const gains = new WeakMap<HTMLMediaElement, GainNode>();

/**
 * "Even out music volume": the music (elements marked data-music) runs through
 * a compressor, loud parts down and quiet ones up. -20 dB at 3:1 about halves
 * the swing within a song; the 1 dB after it keeps the average where it was.
 * Off: threshold 0 and 1:1, a pass-through.
 */
const squeezers = new Set<{ c: DynamicsCompressorNode; up: GainNode }>();
let evenOut = true;

function squeeze({ c, up }: { c: DynamicsCompressorNode; up: GainNode }) {
  c.threshold.value = evenOut ? -20 : 0;
  c.ratio.value = evenOut ? 3 : 1;
  c.knee.value = 10;
  c.attack.value = 0.01;
  c.release.value = 0.3;
  up.gain.value = evenOut ? 1.12 : 1;
}

export function setEvenOut(on: boolean): void {
  evenOut = on;
  squeezers.forEach(squeeze);
}

function routed(a: HTMLMediaElement): GainNode | null {
  if (!audioCtx) return null;
  let g = gains.get(a);
  if (!g) {
    try {
      g = audioCtx.createGain();
      let from: AudioNode = audioCtx.createMediaElementSource(a);
      if (a.dataset.music) {
        const s = { c: audioCtx.createDynamicsCompressor(), up: audioCtx.createGain() };
        squeeze(s);
        squeezers.add(s);
        from = from.connect(s.c).connect(s.up);
      }
      from.connect(g).connect(audioCtx.destination);
      gains.set(a, g);
    } catch {
      return null;
    }
  }
  return g;
}

/**
 * Phones (iOS) ignore an audio element's volume, so once a tap has started the
 * page's AudioContext each element plays through a gain of its own instead.
 */
export function setLevel(a: HTMLMediaElement, level: number): void {
  const v = Math.max(0, Math.min(1, level));
  const g = routed(a);
  if (g) g.gain.value = v;
  else a.volume = v;
}

/**
 * Starts the sounds beside the video from a tap: phones (iOS) only let a sound
 * start from one, and once started there it may be played and paused from code
 * after. Call it in the click (or key) handler, before the video plays.
 */
export function unlock(els: (HTMLMediaElement | null)[], v: HTMLVideoElement | null): void {
  if (typeof window === 'undefined') return;
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) audioCtx = new Ctx();
  }
  void audioCtx?.resume().catch(() => undefined);
  for (const a of els) {
    if (!a) continue;
    routed(a);
    if (v && a.readyState > 0) a.currentTime = Math.min(v.currentTime, a.duration || v.currentTime);
    void a.play().then(
      () => {
        if (v?.paused) a.pause();
      },
      () => undefined
    );
  }
}

/** Slowed down, the sound drops in pitch like tape instead of the browser keeping it at pitch. */
export function tapeSpeed(
  el: { preservesPitch: boolean; playbackRate: number; webkitPreservesPitch?: boolean },
  rate: number
): void {
  el.preservesPitch = false;
  el.webkitPreservesPitch = false;
  el.playbackRate = rate;
}

/**
 * Keeps `a` playing along with `v`: at the same place (`loop`: from the start
 * again when the video runs longer), playing, pausing and slowing with it, at
 * `level()` each frame. Returns what stops it.
 */
export function follow(
  v: HTMLVideoElement,
  a: HTMLAudioElement,
  level: () => number,
  loop = false
): () => void {
  const at = () => (loop && a.duration ? v.currentTime % a.duration : v.currentTime);
  const sync = () => {
    if (a.readyState > 0) a.currentTime = Math.min(at(), a.duration || at());
  };
  const start = () => {
    sync();
    if (loop || !a.duration || v.currentTime < a.duration) void a.play().catch(() => undefined);
  };
  const stop = () => a.pause();
  // The video waits for data: the sound waits with it, so it doesn't run ahead and jump back.
  const buffering = () => {
    if (!v.paused) a.pause();
  };
  const rate = () => tapeSpeed(a, v.playbackRate);
  let frame = 0;
  let lastSync = 0;
  const tick = () => {
    setLevel(a, level());
    // Back in step only when clearly off, and not again within 2 s: each jump is heard as a click.
    const now = performance.now();
    if (
      !v.paused &&
      v.readyState > 2 &&
      a.readyState > 1 &&
      now - lastSync > 2000 &&
      Math.abs(a.currentTime - at()) > 0.3 &&
      (loop || at() < a.duration)
    ) {
      lastSync = now;
      sync();
    }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  v.addEventListener('play', start);
  v.addEventListener('playing', start);
  v.addEventListener('waiting', buffering);
  v.addEventListener('pause', stop);
  v.addEventListener('ended', stop);
  v.addEventListener('seeked', sync);
  v.addEventListener('ratechange', rate);
  a.addEventListener('loadedmetadata', sync);
  rate();
  if (!v.paused) start();
  return () => {
    cancelAnimationFrame(frame);
    v.removeEventListener('play', start);
    v.removeEventListener('playing', start);
    v.removeEventListener('waiting', buffering);
    v.removeEventListener('pause', stop);
    v.removeEventListener('ended', stop);
    v.removeEventListener('seeked', sync);
    v.removeEventListener('ratechange', rate);
    a.removeEventListener('loadedmetadata', sync);
    a.pause();
  };
}

/**
 * The player full screen. iPhones can't do that to anything but a video, and only
 * through Safari's own player, without our controls: the video alone is better than
 * a button that does nothing.
 */
export function toggleFullscreen(box: HTMLElement | null, video: HTMLVideoElement | null): void {
  if (document.fullscreenElement) void document.exitFullscreen();
  else if (box?.requestFullscreen) void box.requestFullscreen();
  else (video as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null)?.webkitEnterFullscreen?.();
}
