/**
 * Tape-stop / spin-down (and spin-up) — variable-rate playback with a
 * decelerating (or accelerating) read pointer, turntable/tape-deck style. A free-
 * spinning platter under constant friction/motor torque has constant angular
 * deceleration, so speed decays linearly by default (`curve` generalizes to
 * non-constant torque; `curve` 1 is the physical constant-torque case).
 */
export interface TapestopOptions {
  /** when the stop/start begins, seconds, default 0 */
  at?: number
  /** ramp duration, seconds, default 1 */
  time?: number
  /** speed-profile exponent — 1 = linear, >1 = faster initial drop, <1 = held then dropping, default 1 */
  curve?: number
  /** 'stop' decelerates to silence, 'start' accelerates from a stopped read, default 'stop' */
  direction?: 'stop' | 'start'
  /** 0–1 random rate wobble during the ramp, default 0 */
  flutter?: number
  /** sample rate, default 44100 */
  fs?: number
  /** seeded-LCG seed for deterministic flutter (kernel-only, not host-automatable), default 0x9e3779b9 */
  seed?: number
}

/**
 * Mutates `data` in place and returns the same reference. Whole-buffer effect —
 * the read-pointer integration spans the full buffer, so it needs the complete
 * signal in one call, not a per-block stream; no state persists across calls.
 */
export default function tapeStop(data: Float32Array, options?: TapestopOptions): Float32Array
