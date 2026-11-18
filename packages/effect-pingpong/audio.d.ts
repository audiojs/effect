// Generated from the audio.js manifest (params metadata is the source of truth).
// Regenerate: node tools/dts.js in @audio/compile. Do not edit by hand.

/** Automatable number — scalar, `t => value` fn, or breakpoint curve {t, v} */
type Auto = number | ((t: number) => number) | { t: number[], v: number[] }
/** Per-block param values as delivered by hosts (numbers arrive as 1-length Float32Array) */
type Live = Record<string, Float32Array | string | boolean>
type Ctx = { sampleRate: number, maxBlockSize: number, maxChannels: number, currentTime: number, duration?: number, events?: readonly any[], emit?: (name: string, ...args: any[]) => void, [k: string]: unknown }
type Process = (inputs: Float32Array[][], outputs: Float32Array[][], params: Live) => void

/** Chainable-host options for 'pingpong' */
export interface PingpongOptions {
  /** 0.01..2 s (default 0.25) */
  "time"?: Auto
  /** 0..0.9 (default 0.4) */
  "feedback"?: Auto
  /** 0..1 (default 0.5) */
  "mix"?: Auto
  /** default "off" */
  "sync"?: "off" | "1/2" | "1/4" | "1/4t" | "1/8d" | "1/8" | "1/8t" | "1/16"
  at?: number | string
  duration?: number | string
}

export declare const pingpong: {
  (ctx: Ctx): Process
  channels: 2
  tail: (at: { sampleRate: number, params: Live, buffers: {} }) => number
  params: {
    /** 0.01..2 s (default 0.25) */
    "time": { type: "number", default: 0.25 }
    /** 0..0.9 (default 0.4) */
    "feedback": { type: "number", default: 0.4 }
    /** 0..1 (default 0.5) */
    "mix": { type: "number", default: 0.5 }
    /** default "off" */
    "sync": { type: "enum", values: ["off","1/2","1/4","1/4t","1/8d","1/8","1/8t","1/16"], default: "off" }
  }
}
