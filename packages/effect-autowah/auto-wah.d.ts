/** Auto-wah — envelope follower drives a resonant bandpass cutoff; signal level controls the sweep. */
export interface AutoWahOptions {
  /** minimum cutoff, Hz, default 300 */
  base?: number
  /** sweep range above `base`, Hz, default 3000 */
  range?: number
  /** filter resonance, default 5 */
  Q?: number
  /** envelope attack, seconds, default 0.002 */
  attack?: number
  /** envelope release, seconds, default 0.1 */
  release?: number
  /** input sensitivity multiplier, default 2 */
  sens?: number
  /** sample rate, default 44100 */
  fs?: number
}

/**
 * Mutates `data` in place and returns the same reference. Pass the same params
 * object across calls — the envelope follower and filter state persist on it
 * (`_env`, `_lp`, `_bp`).
 */
export default function autoWah(data: Float32Array, params?: AutoWahOptions): Float32Array
