/**
 * Frequency shifter — single-sideband shift via Hilbert transform. Every frequency
 * moves by a constant offset (unlike ring-mod, which produces sum/difference pairs).
 */
export interface FrequencyShifterOptions {
  /** shift, Hz — positive = up, negative = down, default 100 */
  shift?: number
  /** wet/dry, 0–1, default 1 */
  mix?: number
  /** Hilbert FIR length, must be odd, default 65. Changing this reallocates the FIR/history buffers, dropping buffered history. */
  taps?: number
  /** sample rate, default 44100 */
  fs?: number
}

/**
 * Mutates `data` in place and returns the same reference. Pass the same params
 * object across calls — the Hilbert FIR coefficients, history ring, and shift
 * oscillator phase persist on it (`_h`, `_buf`, `_p`, `_phase`). Output carries a
 * fixed `(taps - 1) / 2`-sample group delay at every `mix`.
 */
export default function frequencyShifter(data: Float32Array, params?: FrequencyShifterOptions): Float32Array
