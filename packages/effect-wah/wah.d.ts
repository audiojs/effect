/** Wah-wah — swept resonant bandpass filter, auto (LFO) or fixed frequency mode. */
export interface WahOptions {
  /** LFO rate, Hz, default 1.5 */
  rate?: number
  /** sweep depth, octaves, default 0.8. `mode: 'auto'` sweeps `fc` by ±2**depth. */
  depth?: number
  /** center frequency, Hz, default 1000. In `mode: 'manual'`, this is the fixed cutoff. */
  fc?: number
  /** resonance, default 5 */
  Q?: number
  /** `'auto'` sweeps `fc` with the LFO; `'manual'` pins the filter at `fc`, default 'auto' */
  mode?: 'auto' | 'manual'
  /** sample rate, default 44100 */
  fs?: number
}

/**
 * Mutates `data` in place and returns the same reference. Pass the same params
 * object across calls — the filter state and LFO phase persist on it (`_lp`,
 * `_bp`, `_phase`).
 */
export default function wah(data: Float32Array, params?: WahOptions): Float32Array
