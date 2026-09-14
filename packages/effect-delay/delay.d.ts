/** Simple delay — dry signal mixed with a delayed copy and optional feedback. */
export interface DelayOptions {
  /** Non-negative seconds, default 0.25. Uses max(1, floor(time * fs)) samples. Changing that length resets history; empty buffers leave state unchanged. */
  time?: number
  /** Gain per repeat, default 0.3. abs(feedback) < 1 decays; direct calls do not clamp. */
  feedback?: number
  /** wet/dry, 0–1, default 0.5 */
  mix?: number
  /** Finite positive sample rate in Hz, default 44100 */
  fs?: number
}

/**
 * Omitted options use fresh defaults; use a fresh options object to reset.
 * Invalid time/sample rate throws RangeError before input/state changes.
 * Mutates `data` in place and returns the same reference. Pass the same params
 * object across calls — the delay ring buffer and write pointer persist on it
 * (`buffer`, `ptr`).
 */
export default function delay<T extends Float32Array | Float64Array>(data: T, params?: DelayOptions): T
