/** Ping-pong delay — stereo cross-fed delay; left echo bounces to right, right to left. */
export interface PingPongOptions {
  /** Non-negative seconds, default 0.25. Uses max(1, floor(time * fs)) samples. Changing that length resets both rings; empty buffers leave state unchanged. */
  time?: number
  /** Gain per repeat, default 0.4. abs(feedback) < 1 decays; direct calls do not clamp. */
  feedback?: number
  /** wet/dry, 0–1, default 0.5 */
  mix?: number
  /** Finite positive sample rate in Hz, default 44100 */
  fs?: number
}

/**
 * Omitted options use fresh defaults; use a fresh options object to reset.
 * Invalid time/sample rate throws RangeError before input/state changes.
 * Channel lengths must match; otherwise throws RangeError before processing.
 * Mutates `left` and `right` in place and returns `[left, right]` (the same two
 * references). Pass the same params object across calls — the two delay ring
 * buffers and shared write pointer persist on it (`_bufL`, `_bufR`, `_ptr`).
 */
export default function pingPong<L extends Float32Array | Float64Array, R extends Float32Array | Float64Array>(
  left: L,
  right: R,
  params?: PingPongOptions
): [L, R]
