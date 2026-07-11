/** Simple delay — dry signal mixed with a delayed copy and optional feedback. */
export interface DelayOptions {
  /** delay time, seconds, default 0.25. Changing this reallocates the delay buffer, dropping buffered history. */
  time?: number
  /** echo decay, 0–0.95, default 0.3 */
  feedback?: number
  /** wet/dry, 0–1, default 0.5 */
  mix?: number
  /** sample rate, default 44100 */
  fs?: number
}

/**
 * Mutates `data` in place and returns the same reference. Pass the same params
 * object across calls — the delay ring buffer and write pointer persist on it
 * (`buffer`, `ptr`).
 */
export default function delay(data: Float32Array, params?: DelayOptions): Float32Array
