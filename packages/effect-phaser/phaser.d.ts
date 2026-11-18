/** Phaser — cascade of swept first-order allpass filters creating moving notches/peaks. */
export interface PhaserOptions {
  /** LFO rate, Hz, default 0.5 */
  rate?: number
  /** sweep depth, 0–1, default 0.7 */
  depth?: number
  /** allpass stages, integer, default 4. A change crossfades over 20 ms, however the calls fall, from the cascade before to the new one, the stages that enter starting from silence; a count asked during a crossfade follows when it ends. More stages than the state holds grow it, keeping the stages it has. */
  stages?: number
  /** feedback, 0–0.9, default 0.5 */
  feedback?: number
  /** center frequency, Hz, default 1000 */
  fc?: number
  /** LFO phase of each channel ahead of the one before, degrees, −180–180, default 90 (0 moves the channels together); a change glides across the next call */
  phase?: number
  /** index of the channel this call processes, default 0; its LFO runs `channel × phase` degrees ahead */
  channel?: number
  /** sample rate, default 44100 */
  fs?: number
}

/**
 * Mutates `data` in place and returns the same reference. Pass the same params
 * object across calls — the allpass cascade state, LFO phase, feedback sample, stage
 * counts (in force, faded to, and the frames into the fade) and where the last call's
 * lead and fc ended persist on it (`_ap`, `_phase`, `_fb`, `_stages`, `_glide`). A new fc glides across the call, the
 * allpasses retuned each sample. `feedbacks`, when given, holds the feedback for each sample of `data`, in place of
 * `params.feedback`: the `/audio` factory's glide of a moving feedback.
 */
export default function phaser<T extends Float32Array | Float64Array>(data: T, params?: PhaserOptions, feedbacks?: Float64Array): T
