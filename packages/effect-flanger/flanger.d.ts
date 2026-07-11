/** Flanger — modulated short delay (1–10 ms) with feedback, creates a comb-filter sweep. */
export interface FlangerOptions {
  /** LFO rate, Hz, default 0.3 */
  rate?: number
  /** modulation depth, 0–1, default 0.7 */
  depth?: number
  /** center delay, seconds, default 0.003. Changing this reallocates the delay buffer, dropping buffered history. */
  delay?: number
  /** feedback, 0–0.9, default 0.5 */
  feedback?: number
  /** sample rate, default 44100 */
  fs?: number
}

/**
 * Mutates `data` in place and returns the same reference. Pass the same params
 * object across calls — the delay ring buffer, write pointer, and LFO phase
 * persist on it (`buffer`, `ptr`, `_phase`).
 */
export default function flanger(data: Float32Array, params?: FlangerOptions): Float32Array
