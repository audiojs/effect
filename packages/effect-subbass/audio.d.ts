// Generated from the audio.js manifest (params metadata is the source of truth).
// Regenerate: node tools/dts.js in @audio/compile. Do not edit by hand.

/** Automatable number — scalar, `t => value` fn, or breakpoint curve {t, v} */
type Auto = number | ((t: number) => number) | { t: number[], v: number[] }
/** Per-block param values as delivered by hosts (numbers arrive as 1-length Float32Array) */
type Live = Record<string, Float32Array | string | boolean>
type Ctx = { sampleRate: number, maxBlockSize: number, maxChannels: number, currentTime: number, duration?: number, events?: readonly any[], emit?: (name: string, ...args: any[]) => void, [k: string]: unknown }
type Process = (inputs: Float32Array[][], outputs: Float32Array[][], params: Live) => void

/** Chainable-host options for 'subbass' */
export interface SubbassOptions {
  /** 30..200 Hz (default 80) */
  "freq"?: Auto
  /** 0..1 (default 0.5) */
  "amount"?: Auto
  /** 0..1 (default 0.5) */
  "drive"?: Auto
  /** 0..1 (default 1) */
  "keep"?: Auto
  at?: number | string
  duration?: number | string
}

export declare const subbass: {
  (ctx: Ctx): Process
  channels: "any"
  params: {
    /** 30..200 Hz (default 80) */
    "freq": { type: "number", default: 80 }
    /** 0..1 (default 0.5) */
    "amount": { type: "number", default: 0.5 }
    /** 0..1 (default 0.5) */
    "drive": { type: "number", default: 0.5 }
    /** 0..1 (default 1) */
    "keep": { type: "number", default: 1 }
  }
}
