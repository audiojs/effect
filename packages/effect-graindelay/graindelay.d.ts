/**
 * Granular delay — grains read from the delay line with per-grain delay scatter
 * and pitch transposition (Ableton Grain Delay class). Two Hann-windowed heads,
 * staggered by half a grain, retrigger continuously; feedback writes the wet
 * grain stream back into the line.
 */
export interface GraindelayOptions {
  /** base delay, seconds, default 0.25. A grain takes it (and `spray`, `pitch`, `jitter`) where it begins, glided across the call from the value the last call ended on. A grain reading faster than the line runs begins far enough back that its read never passes the write. A line too short for the settings is made anew, empty. */
  time?: number
  /** random extra delay per grain, seconds, default 0.02 */
  spray?: number
  /** per-grain transposition, semitones, default 0 */
  pitch?: number
  /** random pitch scatter, semitones, default 0 */
  jitter?: number
  /** grain length, seconds, default 0.08. A new length stretches both windows from where they are, half a grain apart. */
  grain?: number
  /** feedback, 0–0.9, default 0.3 */
  feedback?: number
  /** wet/dry, 0–1, default 0.5 */
  mix?: number
  /** sample rate, default 44100 */
  fs?: number
  /** grain-scatter PRNG seed (kernel-only, not host-automatable), default 0x9e3779b9 */
  seed?: number
}

/**
 * Mutates `data` in place and returns the same reference. Pass the same params
 * object across calls — the delay buffer, its write position, the two grain heads,
 * the scatter generator and the settings the last call ended on persist on it
 * (`_buf`, `_w`, `_heads`, `_rnd`, `_glide`). A line made for longer (the `/audio`
 * factory makes it for every param's max) keeps its history as the settings change. `mixes`, when given, holds the mix
 * for each sample of `data`, in place of `params.mix`: the `/audio` factory's glide of a moving mix.
 */
export default function grainDelay<T extends Float32Array | Float64Array>(data: T, params?: GraindelayOptions, mixes?: Float64Array): T
