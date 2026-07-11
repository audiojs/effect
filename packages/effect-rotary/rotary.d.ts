/**
 * Rotary speaker (Leslie) simulation — a treble horn and bass drum spin at
 * independent, inertia-limited rates below a crossover split, each producing
 * Doppler pitch modulation and directivity amplitude modulation as they turn past
 * two virtual mics. Mono in, stereo out: caller pre-fills both `left` and `right`
 * with the same dry mono signal; the kernel averages them back to mono internally,
 * then writes distinct L/R.
 */
export interface RotaryOptions {
  /** wet/dry, 0–1, default 1. At 0, returns `[left, right]` unchanged (exact bypass). */
  mix?: number
  /** horn/drum crossover split, Hz, default 800 */
  crossover?: number
  /** Doppler + directivity modulation intensity, 0–1 (clamped), default 1 */
  depth?: number
  /** horn spin-up/down time constant, seconds, default 0.6 */
  hornInertia?: number
  /** drum spin-up/down time constant, seconds, default 2.5 (the heavier drum lags the horn) */
  drumInertia?: number
  /** angle between the two virtual mics, radians, default π/2 (≈1.5708) */
  micSpread?: number
  /**
   * horn rotor target rate, Hz. When either `hornSpeed` or `drumSpeed` is set,
   * this explicit pair wins over `speed`; unset defaults to the chorale rate (0.8)
   * only when `drumSpeed` is set (otherwise `speed` resolves both).
   */
  hornSpeed?: number
  /** drum rotor target rate, Hz — see `hornSpeed` */
  drumSpeed?: number
  /**
   * named or explicit rotor speed pair, used only when neither `hornSpeed` nor
   * `drumSpeed` is set: `'chorale'` (0.8/0.7 Hz, default), `'tremolo'` (6.7/5.9 Hz),
   * `'off'` (0/0), or an explicit `{ horn, drum }` Hz pair
   */
  speed?: 'chorale' | 'tremolo' | 'off' | { horn: number, drum: number }
  /** horn mic-axis path radius, meters (kernel-only, not host-automatable), default 0.09 */
  hornRadius?: number
  /** drum mic-axis path radius, meters (kernel-only, not host-automatable), default 0.05 */
  drumRadius?: number
  /** horn directivity amplitude-modulation depth (kernel-only, not host-automatable), default 0.5 */
  hornAM?: number
  /** drum directivity amplitude-modulation depth (kernel-only, not host-automatable), default 0.25 */
  drumAM?: number
  /** sample rate, default 44100 */
  fs?: number
}

/**
 * Mutates `left` and `right` in place and returns `[left, right]` (the same two
 * references). Pass the same params object across calls — the crossover filter
 * state, per-rotor delay rings, phases, and inertia-glided rates persist on it
 * (`_sos`, `_hornBuf`, `_drumBuf`, `_hornPtr`, `_drumPtr`, `_hornPhase`,
 * `_drumPhase`, `_hornF`, `_drumF`, `_lpState`, `_hpState`). Switching
 * `hornSpeed`/`drumSpeed`/`speed` mid-stream glides through the inertia model
 * instead of snapping.
 */
export default function rotary(
  left: Float32Array,
  right: Float32Array,
  params?: RotaryOptions
): [Float32Array, Float32Array]
