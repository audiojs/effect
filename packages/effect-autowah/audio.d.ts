// Generated from the audio.js manifest (params metadata is the source of truth).
// Regenerate: node tools/dts.js in @audio/compile. Do not edit by hand.

/** Automatable number — scalar, `t => value` fn, or breakpoint curve {t, v} */
type Auto = number | ((t: number) => number) | { t: number[], v: number[] }
/** Per-block param values as delivered by hosts (numbers arrive as 1-length Float32Array) */
type Live = Record<string, Float32Array | string | boolean>
type Ctx = { sampleRate: number, maxBlockSize: number, maxChannels: number, currentTime: number, duration?: number, events?: readonly any[], emit?: (name: string, ...args: any[]) => void, [k: string]: unknown }
type Process = (inputs: Float32Array[][], outputs: Float32Array[][], params: Live) => void

/** Chainable-host options for 'autowah' */
export interface AutowahOptions {
  /** 50..1000 Hz (default 300) */
  "base"?: Auto
  /** 100..6000 Hz (default 3000) */
  "range"?: Auto
  /** 0.5..20 (default 5) */
  "Q"?: Auto
  /** 0.0005..0.05 s (default 0.002) */
  "attack"?: Auto
  /** 0.01..1 s (default 0.1) */
  "release"?: Auto
  /** 0.5..10 (default 2) */
  "sens"?: Auto
  at?: number | string
  duration?: number | string
}

export declare const autowah: {
  (ctx: Ctx): Process
  channels: "any"
  params: {
    /** 50..1000 Hz (default 300) */
    "base": { type: "number", default: 300 }
    /** 100..6000 Hz (default 3000) */
    "range": { type: "number", default: 3000 }
    /** 0.5..20 (default 5) */
    "Q": { type: "number", default: 5 }
    /** 0.0005..0.05 s (default 0.002) */
    "attack": { type: "number", default: 0.002 }
    /** 0.01..1 s (default 0.1) */
    "release": { type: "number", default: 0.1 }
    /** 0.5..10 (default 2) */
    "sens": { type: "number", default: 2 }
  }
}
