/** Ping-pong delay — stereo cross-fed delay; left echo bounces to right, right to left. */
export interface PingPongOptions {
  /** Non-negative seconds, default 0.25. Reads delaySamples(time, fs) samples back, between two samples where that is not a whole frame. A new time glides across the call from the one the last call ended on, the reads moving at most half a frame a frame farther back and a frame a frame nearer (half speed to double, an octave down or up at most); a farther move goes on across the calls after, until the reads are on the time. Rings too short for it are made anew, empty; empty buffers leave state unchanged. */
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
 * buffers, shared write pointer, and the time the last call ended on and where its reads
 * were persist on it (`_bufL`, `_bufR`, `_ptr`, `_glide`). Rings made for a longer time (the `/audio`
 * factory makes them for 2 s) keep their history as the time changes.
 */
export default function pingPong<L extends Float32Array | Float64Array, R extends Float32Array | Float64Array>(
  left: L,
  right: R,
  params?: PingPongOptions
): [L, R]

/**
 * The same as the default, without the pair it returns: what a host's block loop calls, as it
 * may allocate nothing. Throws as the default does on channel lengths that do not match. `mixes`, when given, holds the
 * mix for each frame, in place of `params.mix`: the `/audio` factory's glide of a moving mix.
 */
export function pingPongInPlace(left: Float32Array | Float64Array, right: Float32Array | Float64Array, params?: PingPongOptions, mixes?: Float64Array): void

/**
 * The delay in samples a time asks for: max(1, time * fs), or the whole frame it is
 * within a Float32 step (2^-23 of it) of, as a host passes a time as a Float32.
 */
export function delaySamples(time: number, fs: number): number
