// Generated from the audio.js manifest (params metadata is the source of truth).
// Regenerate: node tools/dts.js in @audio/compile. Do not edit by hand.

/** Automatable number — scalar, `t => value` fn, or breakpoint curve {t, v} */
type Auto = number | ((t: number) => number) | { t: number[], v: number[] }
/** Per-block param values as delivered by hosts (numbers arrive as 1-length Float32Array) */
type Live = Record<string, Float32Array | string | boolean>
type Ctx = { sampleRate: number, maxBlockSize: number, maxChannels: number, currentTime: number, duration?: number, events?: readonly any[], emit?: (name: string, ...args: any[]) => void, [k: string]: unknown }
type Process = (inputs: Float32Array[][], outputs: Float32Array[][], params: Live) => void

/** Chainable-host options for 'lofi' */
export interface LofiOptions {
  /** 0..1 (default 0.3) */
  "wow"?: Auto
  /** 0..1 (default 0.2) */
  "flutter"?: Auto
  /** 0..1 (default 0.1) */
  "noise"?: Auto
  /** 0..1 (default 0.1) */
  "crackle"?: Auto
  /** 500..18000 Hz (default 6000) */
  "lowpass"?: Auto
  /** 20..500 Hz (default 60) */
  "highpass"?: Auto
  /** 0..1 (default 0.3) */
  "drive"?: Auto
  at?: number | string
  duration?: number | string
}

export declare const lofi: {
  (ctx: Ctx): Process
  channels: "any"
  tail: 0.1
  params: {
    /** 0..1 (default 0.3) */
    "wow": { type: "number", default: 0.3 }
    /** 0..1 (default 0.2) */
    "flutter": { type: "number", default: 0.2 }
    /** 0..1 (default 0.1) */
    "noise": { type: "number", default: 0.1 }
    /** 0..1 (default 0.1) */
    "crackle": { type: "number", default: 0.1 }
    /** 500..18000 Hz (default 6000) */
    "lowpass": { type: "number", default: 6000 }
    /** 20..500 Hz (default 60) */
    "highpass": { type: "number", default: 60 }
    /** 0..1 (default 0.3) */
    "drive": { type: "number", default: 0.3 }
  }
}
