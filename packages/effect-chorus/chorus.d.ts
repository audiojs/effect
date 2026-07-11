/** Chorus — multiple detuned delay voices layered over dry signal, ensemble thickening. */
export interface ChorusOptions {
  /** LFO rate, Hz, default 1.5 */
  rate?: number
  /** modulation depth, 0–1, default 0.5 */
  depth?: number
  /** center delay, seconds, default 0.02. Changing this reallocates the delay buffer, dropping buffered history. */
  delay?: number
  /** number of chorus voices, integer ≥ 1, default 3. Changing this (without also growing `delay`) reallocates the LFO phase array, dropping buffered history. */
  voices?: number
  /** sample rate, default 44100 */
  fs?: number
}

/**
 * Mutates `data` in place and returns the same reference. Pass the same params
 * object across calls — the delay ring buffer, write pointer, and per-voice LFO
 * phases persist on it (`buffer`, `ptr`, `_phases`).
 */
export default function chorus(data: Float32Array, params?: ChorusOptions): Float32Array
