/** Ping-pong delay — stereo cross-fed delay; left echo bounces to right, right to left. */
export interface PingPongOptions {
  /** delay time, seconds, default 0.25. Changing this reallocates both delay buffers, dropping buffered history. */
  time?: number
  /** feedback, 0–0.9, default 0.4 */
  feedback?: number
  /** wet/dry, 0–1, default 0.5 */
  mix?: number
  /** sample rate, default 44100 */
  fs?: number
}

/**
 * Mutates `left` and `right` in place and returns `[left, right]` (the same two
 * references). Pass the same params object across calls — the two delay ring
 * buffers and shared write pointer persist on it (`_bufL`, `_bufR`, `_ptr`).
 */
export default function pingPong(
  left: Float32Array,
  right: Float32Array,
  params?: PingPongOptions
): [Float32Array, Float32Array]
