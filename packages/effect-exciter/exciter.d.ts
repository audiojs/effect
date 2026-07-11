/** Exciter — Aphex-style aural exciter; SVF highpass extracts the high band, tanh saturation synthesizes harmonics, mixed back into dry. */
export interface ExciterOptions {
  /** highpass cutoff, Hz, default 3000 */
  freq?: number
  /** saturation amount, 0–1, maps to 1×–10× gain, default 0.5 */
  drive?: number
  /** mix-in level, 0–1, default 0.5 */
  amount?: number
  /** sample rate, default 44100 */
  fs?: number
}

/**
 * Mutates `data` in place and returns the same reference. Pass the same params
 * object across calls — the SVF integrator state persists on it (`_lp`, `_bp`).
 */
export default function exciter(data: Float32Array, params?: ExciterOptions): Float32Array
