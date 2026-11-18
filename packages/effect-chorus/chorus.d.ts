/** Chorus — multiple detuned delay voices layered over dry signal, ensemble thickening. */
export interface ChorusOptions {
  /** LFO rate, Hz, default 1.5 */
  rate?: number
  /** modulation depth, 0–1, default 0.5; a change glides across the next call */
  depth?: number
  /** center delay, seconds, default 0.02; a change glides across the next call, its centre moving at most half a frame a frame farther or a frame nearer, each over 1 + depth, so that a voice's read runs between half and double speed besides its LFO; a farther move goes on across the calls after. A ring made for a longer delay holds a shorter one, every sample at its age; a longer delay than the ring holds makes a ring for it anew, dropping buffered history. */
  delay?: number
  /** number of chorus voices, integer ≥ 1, default 3. A change crossfades over 20 ms, however the calls fall, from the voices before to as many again, spaced from voice 0, each set at its own lead; a count asked during a crossfade follows when it ends. */
  voices?: number
  /** offset of each channel's voices from the channel before's, degrees, −180–180, default 90. The voices sit 360/voices degrees of LFO apart and `phase` divides that spacing as degrees divide a cycle: 0 moves the channels together, 180 puts a channel's voices halfway between the other's, and with one voice it is LFO degrees. A change glides across the next call */
  phase?: number
  /** index of the channel this call processes, default 0; its LFOs run `channel × phase / voices` degrees ahead */
  channel?: number
  /** sample rate, default 44100 */
  fs?: number
}

/**
 * Mutates `data` in place and returns the same reference. Pass the same params
 * object across calls — the delay ring buffer, write pointer, per-voice LFO
 * phases, the voice counts (in force, faded to, and the frames into the fade) and
 * where the last call's lead, depth and delay ended and where the reads' centre was persist on it (`buffer`, `ptr`,
 * `_phases`, `_next`, `_voices`, `_glide`).
 */
export default function chorus<T extends Float32Array | Float64Array>(data: T, params?: ChorusOptions): T
