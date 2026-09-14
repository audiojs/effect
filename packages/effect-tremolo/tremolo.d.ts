/** Tremolo — amplitude modulation via LFO, periodic volume pulsing. */
export interface TremoloOptions {
  /** LFO rate, Hz, default 5 */
  rate?: number
  /** modulation depth, 0–1, default 0.5 */
  depth?: number
  /** sample rate, default 44100 */
  fs?: number
}

/**
 * Mutates `data` in place and returns the same reference. Pass the same params
 * object across calls — the running LFO phase persists on it (`_phase`).
 */
export default function tremolo<T extends Float32Array | Float64Array>(data: T, params?: TremoloOptions): T
