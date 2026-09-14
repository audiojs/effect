/** Rate-of-change (slew) limiter — nonlinear, clips the derivative; prevents clicks, smooths control signals. */
export interface SlewLimiterOptions {
  /** maximum rise rate, units/second, default 1000 */
  rise?: number
  /** maximum fall rate, units/second, default 1000 */
  fall?: number
  /** sample rate, default 44100 */
  fs?: number
}

/**
 * Mutates `data` in place and returns the same reference. Pass the same params
 * object across calls — the running output sample persists on it (`y`, seeded
 * from `data[0]` on the first call if absent).
 */
export default function slewLimiter<T extends Float32Array | Float64Array>(data: T, params?: SlewLimiterOptions): T
