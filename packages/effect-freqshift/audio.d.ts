// Generated from the audio.js manifest (params metadata is the source of truth).
// Regenerate: node tools/dts.js in @audio/compile. Do not edit by hand.

/** Automatable number — scalar, `t => value` fn, or breakpoint curve {t, v} */
type Auto = number | ((t: number) => number) | { t: number[], v: number[] }
/** Per-block param values as delivered by hosts (numbers arrive as 1-length Float32Array) */
type Live = Record<string, Float32Array | string | boolean>
type Ctx = { sampleRate: number, maxBlockSize: number, maxChannels: number, currentTime: number, duration?: number, events?: readonly any[], emit?: (name: string, ...args: any[]) => void, [k: string]: unknown }
type Process = (inputs: Float32Array[][], outputs: Float32Array[][], params: Live) => void

/** Chainable-host options for 'freqshift' */
export interface FreqshiftOptions {
  /** -2000..2000 Hz (default 100) */
  "shift"?: Auto
  /** 0..1 (default 1) */
  "mix"?: Auto
  /** 17..255 (default 65) */
  "taps"?: Auto
  at?: number | string
  duration?: number | string
}

export declare const freqshift: {
  (ctx: Ctx): Process
  channels: "any"
  latency: (ctx: { sampleRate: number, params: Live }) => number
  params: {
    /** -2000..2000 Hz (default 100) */
    "shift": { type: "number", default: 100 }
    /** 0..1 (default 1) */
    "mix": { type: "number", default: 1 }
    /** 17..255 (default 65) [restart] */
    "taps": { type: "number", default: 65 }
  }
}
