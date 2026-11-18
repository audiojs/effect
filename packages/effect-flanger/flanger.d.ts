/** Flanger — modulated short delay (1–10 ms) with feedback, creates a comb-filter sweep. */
export interface FlangerOptions {
  /** LFO rate, Hz, default 0.3 */
  rate?: number
  /** modulation depth, 0–1, default 0.7; a change glides across the next call */
  depth?: number
  /** center delay, seconds, default 0.003; the swept delay is held at one sample or more, as the feedback loop needs. A change glides across the next call, its centre moving at most half a frame a frame farther or a frame nearer, each over 1 + depth, so that the read runs between half and double speed besides its LFO; a farther move goes on across the calls after. A ring made for a longer delay holds a shorter one; a longer delay than the ring holds makes a ring for it anew, dropping buffered history. */
  delay?: number
  /** feedback, 0–0.9, default 0.5 */
  feedback?: number
  /** LFO phase of each channel ahead of the one before, degrees, −180–180, default 90 (0 moves the channels together); a change glides across the next call */
  phase?: number
  /** index of the channel this call processes, default 0; its LFO runs `channel × phase` degrees ahead */
  channel?: number
  /** sample rate, default 44100 */
  fs?: number
}

/**
 * Mutates `data` in place and returns the same reference. Pass the same params
 * object across calls — the delay ring buffer, write pointer, LFO phase,
 * and where the last call's lead, depth and delay ended and where the read's centre was persist on it (`buffer`,
 * `ptr`, `_phase`, `_glide`).
 */
export default function flanger<T extends Float32Array | Float64Array>(data: T, params?: FlangerOptions): T
