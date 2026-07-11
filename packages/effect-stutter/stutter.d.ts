/**
 * Stutter / beat-repeat (Ableton Beat Repeat class) — every `interval`, captures a
 * `slice`-length window and retriggers it for the rest of the interval. Edge fades
 * kill retrigger clicks; `decay` attenuates successive repeats; `mix` blends
 * against the uninterrupted dry signal.
 */
export interface StutterOptions {
  /** capture cycle length, seconds, default 0.5. Changing this (or `slice`) reallocates the capture buffer, dropping buffered history. */
  interval?: number
  /** captured slice length, seconds, default 0.125 */
  slice?: number
  /** amplitude loss per repeat, 0–1, default 0 */
  decay?: number
  /** wet/dry, 0–1, default 1 */
  mix?: number
  /** sample rate, default 44100 */
  fs?: number
}

/**
 * Mutates `data` in place and returns the same reference. Pass the same params
 * object across calls — the captured slice buffer and cycle position persist on
 * it (`_slice`, `_pos`).
 */
export default function stutter(data: Float32Array, params?: StutterOptions): Float32Array
