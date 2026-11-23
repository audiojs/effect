// Generated from the audio.js manifest (params metadata is the source of truth).
// Regenerate: node tools/dts.js in @audio/plugin. Do not edit by hand.

/** Automatable number — scalar, `t => value` fn, or breakpoint curve {t, v} */
type Auto = number | ((t: number) => number) | { t: number[], v: number[] }
/** Per-block param values as delivered by hosts (numbers arrive as 1-length Float32Array) */
type Live = Record<string, Float32Array | string | boolean>
type Transport = Readonly<{ playing: boolean, bpm: number, beat: number, barStart: number, timeSig: [number, number] }>
/** What a host hands a processor it builds: the contract's Context (CONTRACT.d.ts, 1.0) */
type Ctx = { readonly sampleRate: number, readonly maxBlockSize: number, readonly maxChannels: number, readonly layouts?: { readonly inputs: readonly (string | undefined)[], readonly outputs: readonly (string | undefined)[] }, readonly params: Live, readonly buffers: Readonly<Record<string, Float32Array[] | undefined>>, readonly events?: readonly { time: number, kind: 'on' | 'off', midi: number, velocity: number, id: number }[], emit(name: string, value: number): void, readonly transport: Transport }
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
  tail: (at: { sampleRate: number, params: Live, buffers?: {}, transport: Transport }) => number
  params: {
    /** 50..1000 Hz (default 300) */
    "base": { type: "number", min: 50, max: 1000, default: 300, unit: "Hz", curve: "log" }
    /** 100..6000 Hz (default 3000) */
    "range": { type: "number", min: 100, max: 6000, default: 3000, unit: "Hz", curve: "log" }
    /** 0.5..20 (default 5) */
    "Q": { type: "number", min: 0.5, max: 20, default: 5 }
    /** 0.0005..0.05 s (default 0.002) */
    "attack": { type: "number", min: 0.0005, max: 0.05, default: 0.002, unit: "s" }
    /** 0.01..1 s (default 0.1) */
    "release": { type: "number", min: 0.01, max: 1, default: 0.1, unit: "s" }
    /** 0.5..10 (default 2) */
    "sens": { type: "number", min: 0.5, max: 10, default: 2 }
  }
}
