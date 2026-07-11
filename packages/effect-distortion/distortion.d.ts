/** Distortion / saturation — non-linear waveshaping: cubic soft clip, hard clip, tanh, or wavefolding. */
export interface DistortionOptions {
  /** distortion amount, 0–1, maps to 1×–10× input gain, default 0.5 */
  drive?: number
  /** waveshaper type, default 'soft' */
  type?: 'soft' | 'hard' | 'tanh' | 'foldback'
  /** wet/dry, 0–1, default 1 */
  mix?: number
}

/**
 * Mutates `data` in place and returns the same reference. Stateless per-sample
 * transfer curve — no state persists between calls.
 */
export default function distortion(data: Float32Array, params?: DistortionOptions): Float32Array
