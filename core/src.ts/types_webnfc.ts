// Type definitions for Web NFC
// Project: https://github.com/w3c/web-nfc
// Definitions by: Takefumi Yoshii <https://github.com/takefumi-yoshii>
// TypeScript Version: 3.9

// This type definitions referenced to WebIDL.
// https://w3c.github.io/web-nfc/#actual-idl-index

export interface Window {
    NDEFMessage: NDEFMessage
}
export declare class NDEFMessage {
    constructor(messageInit: NDEFMessageInit)
    records: ReadonlyArray<NDEFRecord>
}
export declare interface NDEFMessageInit {
    records: NDEFRecordInit[]
}

export declare type NDEFRecordDataSource = string | BufferSource | NDEFMessageInit

export interface Window {
    NDEFRecord: NDEFRecord
}
export declare class NDEFRecord {
    constructor(recordInit: NDEFRecordInit)
    readonly recordType: string
    readonly mediaType?: string
    readonly id?: string
    readonly data?: DataView
    readonly encoding?: string
    readonly lang?: string
    toRecords?: () => NDEFRecord[]
}
export declare interface NDEFRecordInit {
    recordType: string
    mediaType?: string
    id?: string
    encoding?: string
    lang?: string
    data?: NDEFRecordDataSource
}

export declare type NDEFMessageSource = string | BufferSource | NDEFMessageInit

export interface Window {
    NDEFReader: NDEFReader
}
export declare class NDEFReader extends EventTarget {
    constructor()
    onreading: (this: this, event: NDEFReadingEvent) => any
    onreadingerror: (this: this, error: Event) => any
    scan: (options?: NDEFScanOptions) => Promise<void>
    write: (
        message: NDEFMessageSource,
        options?: NDEFWriteOptions
    ) => Promise<void>
    makeReadOnly: (options?: NDEFMakeReadOnlyOptions) => Promise<void>
}

export interface Window {
    NDEFReadingEvent: NDEFReadingEvent
}
export declare class NDEFReadingEvent extends Event {
    constructor(type: string, readingEventInitDict: NDEFReadingEventInit)
    serialNumber: string
    message: NDEFMessage
}
export interface NDEFReadingEventInit extends EventInit {
    serialNumber?: string
    message: NDEFMessageInit
}

export interface NDEFWriteOptions {
    overwrite?: boolean
    signal?: AbortSignal
}
export interface NDEFMakeReadOnlyOptions {
    signal?: AbortSignal
}
export interface NDEFScanOptions {
    signal: AbortSignal
}
