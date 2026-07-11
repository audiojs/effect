/** Phaser — cascade of swept first-order allpass filters creating moving notches/peaks. */
export interface PhaserOptions {
  /** LFO rate, Hz, default 0.5 */
  rate?: number
  /** sweep depth, 0–1, default 0.7 */
  depth?: number
  /** allpass stages, integer, default 4. Changing this reallocates the allpass cascade state, dropping buffered history. */
  stages?: number
  /** feedback, 0–0.9, default 0.5 */
  feedback?: number
  /** center frequency, Hz, default 1000 */
  fc?: number
  /** sample rate, default 44100 */
  fs?: number
}

/**
 * Mutates `data` in place and returns the same reference. Pass the same params
 * object across calls — the allpass cascade state, LFO phase, and feedback sample
 * persist on it (`_ap`, `_phase`, `_fb`).
 */
export default function phaser(data: Float32Array, params?: PhaserOptions): Float32Array
