/**
 * Spectral band replication (aural-exciter family) — takes the top octave still
 * present below `cutoff`, regenerates its harmonic series with a waveshaper
 * (harmonics land above `cutoff`), highpasses at `cutoff`, and mixes back in at a
 * level tracking the source band's envelope. Recovers HF lost to lossy encoding
 * or a lowpassed source.
 */
export interface SbrOptions {
  /** where the source content dies, Hz, default 8000 */
  cutoff?: number
  /** replication level, 0–1, default 0.5 */
  amount?: number
  /** waveshaper intensity, 0–1, default 0.5 */
  drive?: number
  /** sample rate, default 44100 */
  fs?: number
}

/**
 * Mutates `data` in place and returns the same reference. Pass the same params
 * object across calls — the source bandpass, output highpass, and envelope-
 * follower state persist on it (`_src`, `_hp1`, `_hp2`, `_env`, `_henv`, `_dc`).
 */
export default function sbr(data: Float32Array, params?: SbrOptions): Float32Array
