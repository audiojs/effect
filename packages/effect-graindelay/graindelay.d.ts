/**
 * Granular delay — grains read from the delay line with per-grain delay scatter
 * and pitch transposition (Ableton Grain Delay class). Two Hann-windowed heads,
 * staggered by half a grain, retrigger continuously; feedback writes the wet
 * grain stream back into the line.
 */
export interface GraindelayOptions {
  /** base delay, seconds, default 0.25. Changing this (or `spray`/`pitch`/`jitter`/`grain`) reallocates the delay buffer, dropping buffered history. */
  time?: number
  /** random extra delay per grain, seconds, default 0.02 */
  spray?: number
  /** per-grain transposition, semitones, default 0 */
  pitch?: number
  /** random pitch scatter, semitones, default 0 */
  jitter?: number
  /** grain length, seconds, default 0.08 */
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
 * object across calls — the delay buffer and the two grain heads persist on it
 * (`_buf`, `_w`, `_heads`, `_rnd`).
 */
export default function grainDelay(data: Float32Array, params?: GraindelayOptions): Float32Array
