/** Vibrato — pitch modulation via a modulated delay line, periodic pitch wobble. */
export interface VibratoOptions {
  /** LFO rate, Hz, default 5 */
  rate?: number
  /** modulation depth, 0–1, scales a fixed max ~6 ms delay-time swing, default 0.5. A change glides across the next call; the delay ring holds depth 1 from the first call. */
  depth?: number
  /** LFO phase of each channel ahead of the one before, degrees, −180–180, default 0 (the channels move together); at 180 their pitches swing opposite ways. A change glides across the next call */
  phase?: number
  /** index of the channel this call processes, default 0; its LFO runs `channel × phase` degrees ahead */
  channel?: number
  /** sample rate, default 44100 */
  fs?: number
}

/**
 * Mutates `data` in place and returns the same reference. Pass the same params
 * object across calls — the delay ring buffer, write pointer, LFO phase and where
 * the last call's lead and depth ended persist on it (`buffer`, `ptr`, `_phase`,
 * `_glide`).
 */
export default function vibrato<T extends Float32Array | Float64Array>(data: T, params?: VibratoOptions): T
