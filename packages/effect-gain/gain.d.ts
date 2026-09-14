/** Gain — simple level adjustment in decibels. */
export interface GainOptions {
  /** gain, dB, default 0 */
  dB?: number
}

/**
 * Mutates `data` in place and returns the same reference. Stateless per-sample
 * scale — no state persists between calls.
 */
export default function gain<T extends Float32Array | Float64Array>(data: T, params?: GainOptions): T
