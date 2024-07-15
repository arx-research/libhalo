import {Buffer} from 'buffer/index.js';


export interface Card {
    type: string
    atr: Buffer
}

export interface ReaderEventListener {
    (eventName: 'card', listener: (card: Card) => void): void;
    (eventName: 'card.off', listener: (card: Card) => void): void;
    (eventName: 'error', listener: (err: Error) => void): void;
    (eventName: 'end', listener: () => void): void;
}

export interface Reader {
    reader: {
        name: string
    }
    autoProcessing: boolean
    transmit: (data: Buffer, responseMaxLength: number) => Promise<Buffer>;
    on: ReaderEventListener
}

export interface TransceiveFunc {
    (data: Buffer): Promise<Buffer>;
}

export interface StatusCallbackDetails {
    execMethod: string
    execStep: string
    cancelScan: () => void
}

export interface PublicKeyList {
    [keyNo: number]: string
}

export interface ExecReturnStruct {
    result: string
    // TODO
    // eslint-disable-next-line
    extra: any
}

export interface ExecHaloCmdOptions {
    method: "credential" | "pcsc" | "webnfc" | "nfc-manager"
    exec: (command: Buffer, options?: ExecCoreCommandOptions) => Promise<ExecReturnStruct>
}

export interface ExecOptions {
    statusCallback?: (status: string, statusDetails: StatusCallbackDetails) => void;
}

export type HaloWebMethod = "credential" | "webnfc";

export interface ExecHaloCmdWebOptions extends ExecOptions {
    method?: HaloWebMethod
    noDebounce?: boolean
}

export interface EmptyOptions {

}

export interface RNNFCManagerIsoDepHandler {
    transceive: (data: number[]) => Promise<number[]>;
}

export interface RNNFCManager {
    isoDepHandler: RNNFCManagerIsoDepHandler
}

// TODO needs verification
export interface ExecCoreCommandOptions {
    noCheck?: boolean
    pcscExecLayer?: "u2f"
}

export interface GatewayWelcomeMsg {
    serverVersion: {
        tagName: string
        commitId: string
        version: number[]
    }
    sessionId: string
}

// TODO proper types for Halo Commands
// eslint-disable-next-line
export type HaloCommandObject = any;
// eslint-disable-next-line
export type HaloResponseObject = any;
// eslint-disable-next-line
export type HaloCommandArgsObject = any;

export interface BridgeOptions {
    createWebSocket?: (url: string) => WebSocket
}

export interface BridgeEvent {
    event: "handle_added" | "handle_removed" | "handle_not_compatible" | "reader_added" | "reader_removed" | "exec_success" | "exec_exception"
    uid: string | null
}

export interface BridgeHandleEvent extends BridgeEvent {
    event: "handle_added" | "handle_removed"
    uid: null
    data: {
        handle: string
        reader_name: string
    }
}

export interface BridgeHandleAdded extends BridgeHandleEvent {
    event: "handle_added"
}

export interface BridgeHandleRemoved extends BridgeHandleEvent {
    event: "handle_removed"
}

export interface BridgeHandleNotCompatibleEvent extends BridgeEvent {
    event: "handle_not_compatible"
    uid: null
    data: {
        reader_name: string
        message: string
    }
}

export interface FindBridgeOptions {
    wsPort?: number
    wssPort?: number
    createWebSocket?: (url: string) => WebSocket
    diagnose?: boolean
}

export interface FindBridgeOptionsNoDiagnose extends FindBridgeOptions {
    diagnose?: false
}

export interface FindBridgeOptionsDiagnose extends FindBridgeOptions {
    diagnose: true
}

export interface FindBridgeResult {
    urls: string[]
    errors: string[]
}

export * from './types_webnfc.js';
