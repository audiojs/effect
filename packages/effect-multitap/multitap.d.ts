/** One delay tap: read `time` seconds back, scaled by `gain`. */
export interface MultitapTap {
  /** tap delay time, seconds */
  time: number
  /** tap gain, default 0.5 */
  gain?: number
}

/** Multi-tap delay — multiple independent delay taps at different times with individual gains. */
export interface MultitapOptions {
  /**
   * delay taps, default `[{ time: 0.25, gain: 0.5 }, { time: 0.5, gain: 0.3 }]`.
   * Recomputed only when this array is replaced by reference (mutating an existing
   * array in place is not detected) — replace `taps` to change the tap layout live.
   */
  taps?: MultitapTap[]
  /** feedback (wet re-fed into the delay line), 0–0.9, default 0 */
  feedback?: number
  /** sample rate, default 44100 */
  fs?: number
}

/**
 * Mutates `data` in place and returns the same reference. Pass the same params
 * object across calls — the delay ring buffer, write pointer, and resolved tap
 * offsets persist on it (`buffer`, `ptr`, `_taps`, `_fs`, `_tapSamples`, `_maxDelay`).
 */
export default function multitap(data: Float32Array, params?: MultitapOptions): Float32Array
