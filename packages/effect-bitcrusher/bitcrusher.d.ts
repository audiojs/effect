/** Bitcrusher — sample-rate reduction (zero-order hold) + bit-depth quantization. */
export interface BitcrusherOptions {
  /** target bit depth, 1–24, default 8 */
  bits?: number
  /** sample-rate ratio, 0–1 (1 = full rate, 0.25 = quarter rate), default 0.25 */
  rate?: number
  /** sample rate, default 44100 */
  fs?: number
}

/**
 * Mutates `data` in place and returns the same reference. Pass the same params
 * object across calls — the held sample and hold-phase counter persist on it
 * (`_held`, `_phase`).
 */
export default function bitcrusher(data: Float32Array, params?: BitcrusherOptions): Float32Array
