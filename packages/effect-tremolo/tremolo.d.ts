/** Tremolo — amplitude modulation via LFO, periodic volume pulsing. */
export interface TremoloOptions {
  /** LFO rate, Hz, default 5 */
  rate?: number
  /** modulation depth, 0–1, default 0.5 */
  depth?: number
  /** LFO phase of each channel ahead of the one before, degrees, −180–180, default 0 (the channels move together); 180 is an auto-pan. A change glides across the next call */
  phase?: number
  /** index of the channel this call processes, default 0; its LFO runs `channel × phase` degrees ahead */
  channel?: number
  /** sample rate, default 44100 */
  fs?: number
}

/**
 * Mutates `data` in place and returns the same reference. Pass the same params
 * object across calls — the running LFO phase and where the last call's lead
 * ended persist on it (`_phase`, `_glide`). `depths`, when given, holds the depth for each sample of `data`, in
 * place of `params.depth`: the `/audio` factory's glide of a moving depth.
 */
export default function tremolo<T extends Float32Array | Float64Array>(data: T, params?: TremoloOptions, depths?: Float64Array): T
