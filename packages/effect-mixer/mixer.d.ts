/** One summed input: `buffer` scaled by `gain` before being added to the mix. */
export interface MixerInput {
  /** input buffer */
  buffer: Float32Array | Float64Array
  /** linear gain multiplier, default 1 */
  gain?: number
}

/**
 * Mixer — sums `inputs` (each `{ buffer, gain }`) into a new `Float64Array` the
 * length of `inputs[0].buffer`. Unlike every other effect atom, this does NOT
 * mutate any input buffer and does NOT return the same reference — it allocates
 * and returns a fresh buffer. `params` is accepted for signature parity with the
 * rest of the family but is currently unused.
 */
export default function mixer(inputs: MixerInput[], params?: Record<string, never>): Float64Array
