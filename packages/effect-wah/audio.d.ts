// Generated from the audio.js manifest (params metadata is the source of truth).
// Regenerate: node tools/dts.js in @audio/compile. Do not edit by hand.

/** Automatable number — scalar, `t => value` fn, or breakpoint curve {t, v} */
type Auto = number | ((t: number) => number) | { t: number[], v: number[] }
/** Per-block param values as delivered by hosts (numbers arrive as 1-length Float32Array) */
type Live = Record<string, Float32Array | string | boolean>
type Ctx = { sampleRate: number, maxBlockSize: number, maxChannels: number, currentTime: number, duration?: number, events?: readonly any[], emit?: (name: string, ...args: any[]) => void, [k: string]: unknown }
type Process = (inputs: Float32Array[][], outputs: Float32Array[][], params: Live) => void

/** Chainable-host options for 'wah' */
export interface WahOptions {
  /** 0.05..10 Hz (default 1.5) */
  "rate"?: Auto
  /** 0..3 oct (default 0.8) */
  "depth"?: Auto
  /** 200..3000 Hz (default 1000) */
  "fc"?: Auto
  /** 0.5..20 (default 5) */
  "Q"?: Auto
  /** default "auto" */
  "mode"?: "auto" | "manual"
  at?: number | string
  duration?: number | string
}

export declare const wah: {
  (ctx: Ctx): Process
  channels: "any"
  params: {
    /** 0.05..10 Hz (default 1.5) */
    "rate": { type: "number", default: 1.5 }
    /** 0..3 oct (default 0.8) */
    "depth": { type: "number", default: 0.8 }
    /** 200..3000 Hz (default 1000) */
    "fc": { type: "number", default: 1000 }
    /** 0.5..20 (default 5) */
    "Q": { type: "number", default: 5 }
    /** default "auto" */
    "mode": { type: "enum", values: ["auto","manual"], default: "auto" }
  }
}
