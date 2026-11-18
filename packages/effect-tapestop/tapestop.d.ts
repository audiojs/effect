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
 * Mutates `data` in place and returns the same reference. Whole-buffer form: one
 * call over the complete signal; no state persists across calls. `tapestopStream`
 * is the same stop over a stream.
 */
export default function tapeStop<T extends Float32Array | Float64Array>(data: T, options?: TapestopOptions): T

export interface TapestopStreamOptions extends TapestopOptions {
  /** frames the output runs late, at least `lead(fs, options)`, default 0 */
  latency?: number
}

/**
 * The same stop over a stream: what the default writes, `latency` frames late, in
 * place, its state carried on `options` from call to call (`_ring`, the input it
 * still has to read, made on the first call when absent; `_n`, `_read`, `_start`,
 * `_rnd`). The stop begins at frame `at` of the stream, read each call until it has.
 */
export function tapestopStream<T extends Float32Array | Float64Array>(data: T, options: TapestopStreamOptions): T

/**
 * The most frames past the one it writes that the read takes input from, at these
 * settings: how late `tapestopStream` must run. Nonzero only in 'stop' with flutter,
 * which can speed the tape past the input at the stop's start.
 */
export function lead(fs?: number, options?: TapestopOptions): number
