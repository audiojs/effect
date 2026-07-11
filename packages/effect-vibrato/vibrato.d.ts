/** Vibrato — pitch modulation via a modulated delay line, periodic pitch wobble. */
export interface VibratoOptions {
  /** LFO rate, Hz, default 5 */
  rate?: number
  /** modulation depth, 0–1, scales a fixed max ~6 ms delay-time swing, default 0.5. Changing this reallocates the delay buffer, dropping buffered history. */
  depth?: number
  /** sample rate, default 44100 */
  fs?: number
}

/**
 * Mutates `data` in place and returns the same reference. Pass the same params
 * object across calls — the delay ring buffer, write pointer, and LFO phase
 * persist on it (`buffer`, `ptr`, `_phase`).
 */
export default function vibrato(data: Float32Array, params?: VibratoOptions): Float32Array
