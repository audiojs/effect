// Generated from the audio.js manifest (params metadata is the source of truth).
// Regenerate: node tools/dts.js in @audio/compile. Do not edit by hand.

/** Automatable number — scalar, `t => value` fn, or breakpoint curve {t, v} */
type Auto = number | ((t: number) => number) | { t: number[], v: number[] }
/** Per-block param values as delivered by hosts (numbers arrive as 1-length Float32Array) */
type Live = Record<string, Float32Array | string | boolean>
type Ctx = { sampleRate: number, maxBlockSize: number, maxChannels: number, currentTime: number, duration?: number, events?: readonly any[], emit?: (name: string, ...args: any[]) => void, [k: string]: unknown }
type Process = (inputs: Float32Array[][], outputs: Float32Array[][], params: Live) => void

/** Chainable-host options for 'tapestop' */
export interface TapestopOptions {
  /** 0..60 s (default 0) */
  "at"?: Auto
  /** 0.05..10 s (default 1) */
  "time"?: Auto
  /** 0.25..4 (default 1) */
  "curve"?: Auto
  /** default "stop" */
  "direction"?: "stop" | "start"
  /** 0..1 (default 0) */
  "flutter"?: Auto
  at?: number | string
  duration?: number | string
}

export declare const tapestop: {
  (ctx: Ctx): Process
  channels: "any"
  streaming: false
  params: {
    /** 0..60 s (default 0) */
    "at": { type: "number", default: 0 }
    /** 0.05..10 s (default 1) */
    "time": { type: "number", default: 1 }
    /** 0.25..4 (default 1) */
    "curve": { type: "number", default: 1 }
    /** default "stop" */
    "direction": { type: "enum", values: ["stop","start"], default: "stop" }
    /** 0..1 (default 0) */
    "flutter": { type: "number", default: 0 }
  }
}
