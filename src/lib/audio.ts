"use client";

// Shared browser audio: one <audio> element for previews and one AudioContext
// for levelling and sound effects. Browsers only allow sound after a user
// gesture (and Safari unlocks per element), so unlockAudio() runs on the
// player's first tap or key press and everything is reused after that.

const SILENT_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

let element: HTMLAudioElement | null = null;
let ctx: AudioContext | null = null;
let levelled = false;

/** The shared preview element. Deezer's CDN allows CORS, which levelling needs. */
export function previewElement(): HTMLAudioElement {
  if (!element) {
    element = new Audio();
    element.crossOrigin = "anonymous";
    element.preload = "auto";
  }
  return element;
}

export function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

/**
 * Previews vary a lot in loudness (One's intro is ~35 dB quieter than Master
 * of Puppets). Lift quiet ones and compress loud ones so every card is
 * audible at a similar level. Only wired once the context is running:
 * a suspended context would silence the element.
 */
function levelPreviews(c: AudioContext) {
  if (levelled || c.state !== "running") return;
  try {
    const source = c.createMediaElementSource(previewElement());
    const lift = new GainNode(c, { gain: 8 }); // +18 dB
    const compressor = new DynamicsCompressorNode(c, {
      threshold: -28,
      knee: 2,
      ratio: 12,
      attack: 0.005,
      release: 0.3,
    });
    const out = new GainNode(c, { gain: 2 });
    source.connect(lift).connect(compressor).connect(out).connect(c.destination);
    levelled = true;
  } catch {
    // Without levelling the element still plays directly.
  }
}

/** Call from a tap or key press. Safe to call repeatedly. */
export function unlockAudio() {
  // iOS: play through the silent switch like other media apps (Safari 17+).
  const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
  if (session) session.type = "playback";

  const c = audioContext();
  if (c && c.state !== "running")
    c.resume().then(
      () => levelPreviews(c),
      () => undefined,
    );
  else if (c) levelPreviews(c);

  const a = previewElement();
  if (!a.src) {
    a.src = SILENT_WAV;
    a.play().then(
      () => a.pause(),
      () => undefined,
    );
  }
}

// ---------------------------------------------------------------------------
// Result sound effects, synthesised (no audio files to license or load).
// ---------------------------------------------------------------------------

function tone(
  c: AudioContext,
  {
    type,
    from,
    to,
    start,
    length,
    volume,
  }: { type: OscillatorType; from: number; to?: number; start: number; length: number; volume: number },
  out: AudioNode,
) {
  const osc = new OscillatorNode(c, { type, frequency: from });
  if (to) osc.frequency.exponentialRampToValueAtTime(to, start + length);
  const env = new GainNode(c, { gain: 0 });
  env.gain.setValueAtTime(0, start);
  env.gain.linearRampToValueAtTime(volume, start + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(env).connect(out);
  osc.start(start);
  osc.stop(start + length + 0.05);
}

/** A bright rising "ding-ding" for a correct guess, a low falling buzz for a wrong one. */
export function playResultSound(correct: boolean) {
  const c = audioContext();
  if (!c || c.state !== "running") return;
  const t = c.currentTime + 0.01;
  const out = new GainNode(c, { gain: 0.6 });
  out.connect(c.destination);
  if (correct) {
    tone(c, { type: "triangle", from: 659.25, start: t, length: 0.16, volume: 0.5 }, out); // E5
    tone(c, { type: "triangle", from: 987.77, start: t + 0.09, length: 0.32, volume: 0.5 }, out); // B5
    tone(c, { type: "square", from: 1975.5, start: t + 0.09, length: 0.12, volume: 0.05 }, out); // sparkle
  } else {
    const lowpass = new BiquadFilterNode(c, { type: "lowpass", frequency: 900 });
    lowpass.connect(out);
    tone(c, { type: "sawtooth", from: 220, to: 82.4, start: t, length: 0.45, volume: 0.45 }, lowpass); // A3 → E2
    tone(c, { type: "square", from: 110, to: 55, start: t, length: 0.3, volume: 0.15 }, lowpass);
  }
}
