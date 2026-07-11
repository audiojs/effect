/**
 * Lo-fi character (RC-20 class) — wow/flutter via LFO-modulated fractional delay,
 * tape saturation, a vinyl noise bed (hiss + sparse crackle), and a 3-pole lowpass
 * ceiling / one-pole highpass floor. Noise is a seeded LCG — renders are
 * deterministic and reproducible.
 */
export interface LofiOptions {
  /** slow pitch drift, 0–1, ~0.7 Hz, up to 3 ms, default 0.3 */
  wow?: number
  /** fast wobble, 0–1, ~7 Hz, up to 0.4 ms, default 0.2 */
  flutter?: number
  /** hiss bed level, 0–1, default 0.1 */
  noise?: number
  /** impulse density/level, 0–1, default 0.1 */
  crackle?: number
  /** bandwidth ceiling, Hz, 3-pole −18 dB/oct, default 6000 */
  lowpass?: number
  /** rumble floor, Hz, one-pole, default 60 */
  highpass?: number
  /** tape saturation amount, 0–1, gain-compensated tanh, default 0.3 */
  drive?: number
  /** sample rate, default 44100 */
  fs?: number
  /** LCG seed for the noise/crackle generator (kernel-only, not host-automatable), default 0x2545f491 */
  seed?: number
}

/**
 * Mutates `data` in place and returns the same reference. Pass the same params
 * object across calls — delay-line, LFO phase, filter, and noise state persist on
 * it (`_buf`, `_ph1`, `_ph2`, `_lp1`..`_lp3`, `_hp`, `_rnd`, `_crk`).
 */
export default function lofi(data: Float32Array, params?: LofiOptions): Float32Array
