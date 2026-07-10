// Generated from the audio.js manifest (params metadata is the source of truth).
// Regenerate: node tools/dts.js in @audio/compile. Do not edit by hand.

/** Automatable number — scalar, `t => value` fn, or breakpoint curve {t, v} */
type Auto = number | ((t: number) => number) | { t: number[], v: number[] }
/** Per-block param values as delivered by hosts (numbers arrive as 1-length Float32Array) */
type Live = Record<string, Float32Array | string | boolean>
type Ctx = { sampleRate: number, maxBlockSize: number, maxChannels: number, currentTime: number, duration?: number, events?: readonly any[], emit?: (name: string, ...args: any[]) => void, [k: string]: unknown }
type Process = (inputs: Float32Array[][], outputs: Float32Array[][], params: Live) => void

/** Chainable-host options for 'sbr' */
export interface SbrOptions {
  /** 2000..16000 Hz (default 8000) */
  "cutoff"?: Auto
  /** 0..1 (default 0.5) */
  "amount"?: Auto
  /** 0..1 (default 0.5) */
  "drive"?: Auto
  at?: number | string
  duration?: number | string
}

export declare const sbr: {
  (ctx: Ctx): Process
  channels: "any"
  params: {
    /** 2000..16000 Hz (default 8000) */
    "cutoff": { type: "number", default: 8000 }
    /** 0..1 (default 0.5) */
    "amount": { type: "number", default: 0.5 }
    /** 0..1 (default 0.5) */
    "drive": { type: "number", default: 0.5 }
  }
}
