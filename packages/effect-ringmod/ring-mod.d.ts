/** Ring modulator — multiplies the signal by a carrier oscillator, produces sum and difference frequencies. */
export interface RingModOptions {
  /** carrier frequency, Hz, default 440 */
  fc?: number
  /** wet/dry, 0–1, default 1 */
  mix?: number
  /** sample rate, default 44100 */
  fs?: number
}

/**
 * Mutates `data` in place and returns the same reference. Pass the same params
 * object across calls — the running carrier phase persists on it (`_phase`).
 */
export default function ringMod(data: Float32Array, params?: RingModOptions): Float32Array
