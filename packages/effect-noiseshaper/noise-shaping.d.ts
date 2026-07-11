/** Noise shaping — error-feedback quantization that shapes quantization noise out of the audible band. */
export interface NoiseShapingOptions {
  /** target bit depth, default 16 */
  bits?: number
}

/**
 * Mutates `data` in place and returns the same reference. Pass the same params
 * object across calls — the running feedback error term persists on it (`_fb`).
 */
export default function noiseShaping(data: Float32Array, params?: NoiseShapingOptions): Float32Array
