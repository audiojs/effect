/**
 * Psychoacoustic bass enhancer (MaxxBass/RBass class) — extracts the band below
 * `freq`, generates its harmonic series with an even/odd waveshaper, band-limits
 * the harmonics to the audible low-mids, and mixes against dry. Small speakers
 * reproduce the harmonics; the ear reconstructs the missing fundamental.
 */
export interface SubbassOptions {
  /** sub cutoff, Hz — harmonics built from below this, default 80 */
  freq?: number
  /** harmonic level, 0–1, default 0.5 */
  amount?: number
  /** waveshaper intensity, 0–1, default 0.5 */
  drive?: number
  /** how much original sub to keep, 0–1, 0 = replace entirely, default 1 */
  keep?: number
  /** sample rate, default 44100 */
  fs?: number
}

/**
 * Mutates `data` in place and returns the same reference. Pass the same params
 * object across calls — the sub-extraction and harmonic-band filter state persist
 * on it (`_sub`, `_out`, `_dc`).
 */
export default function subbass(data: Float32Array, params?: SubbassOptions): Float32Array
