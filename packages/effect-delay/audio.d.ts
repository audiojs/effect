// Generated from the audio.js manifest (params metadata is the source of truth).
// Regenerate: node tools/dts.js in @audio/compile. Do not edit by hand.

/** Automatable number — scalar, `t => value` fn, or breakpoint curve {t, v} */
type Auto = number | ((t: number) => number) | { t: number[], v: number[] }
/** Per-block param values as delivered by hosts (numbers arrive as 1-length Float32Array) */
type Live = Record<string, Float32Array | string | boolean>
type Ctx = { sampleRate: number, maxBlockSize: number, maxChannels: number, currentTime: number, duration?: number, events?: readonly any[], emit?: (name: string, ...args: any[]) => void, [k: string]: unknown }
type Process = (inputs: Float32Array[][], outputs: Float32Array[][], params: Live) => void

/** Chainable-host options for 'delay' */
export interface DelayOptions {
  /** 0.001..4 s (default 0.25) */
  "time"?: Auto
  /** 0..0.95 (default 0.3) */
  "feedback"?: Auto
  /** 0..1 (default 0.5) */
  "mix"?: Auto
  at?: number | string
  duration?: number | string
}

export declare const delay: {
  (ctx: Ctx): Process
  channels: "any"
  tail: 8
  params: {
    /** 0.001..4 s (default 0.25) [restart] */
    "time": { type: "number", default: 0.25 }
    /** 0..0.95 (default 0.3) */
    "feedback": { type: "number", default: 0.3 }
    /** 0..1 (default 0.5) */
    "mix": { type: "number", default: 0.5 }
  }
}
