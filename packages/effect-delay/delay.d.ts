/** Simple delay — dry signal mixed with a delayed copy and optional feedback. */
export interface DelayOptions {
  /** Non-negative seconds, default 0.25. Reads delaySamples(time, fs) samples back, between two samples where that is not a whole frame. A new time glides across the call from the one the last call ended on, the read moving at most half a frame a frame farther back and a frame a frame nearer (half speed to double, an octave down or up at most); a farther move goes on across the calls after, until the read is on the time. A ring too short for it is made anew, empty; empty buffers leave state unchanged. */
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
 * object across calls — the delay ring buffer, write pointer, and the time the last
 * call ended on and where its read was persist on it (`buffer`, `ptr`, `_glide`). A ring made for a longer
 * time (the `/audio` factory makes it for 4 s) keeps its history as the time changes.
 * `mixes`, when given, holds the mix for each sample of `data`, in place of `params.mix`: the `/audio` factory's glide
 * of a moving mix.
 */
export default function delay<T extends Float32Array | Float64Array>(data: T, params?: DelayOptions, mixes?: Float64Array): T

/**
 * The delay in samples a time asks for: max(1, time * fs), or the whole frame it is
 * within a Float32 step (2^-23 of it) of, as a host passes a time as a Float32.
 */
export function delaySamples(time: number, fs: number): number
