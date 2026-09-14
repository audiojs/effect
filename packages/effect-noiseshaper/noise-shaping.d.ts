/** Noise shaping — error-feedback quantization that shapes quantization noise out of the audible band. */
export interface NoiseShapingOptions {
  /** target bit depth, default 16 */
  bits?: number
}

/**
 * Mutates `data` in place and returns the same reference. Pass the same params
 * object across calls — the running feedback error term persists on it (`_fb`).
 */
export default function noiseShaping<T extends Float32Array | Float64Array>(data: T, params?: NoiseShapingOptions): T
