import {Buffer} from 'buffer/index.js';


// These types should only be used internally for the command dispatchers.
// There are specific arg/return types defined for each HaLo command.

// eslint-disable-next-line
export type HaloCommandObject = any;
// eslint-disable-next-line
export type HaloResponseObject = any;

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
    extra: Record<string, string>
}

export interface ExecHaloCmdOptions {
    method: "credential" | "pcsc" | "webnfc" | "nfc-manager"
    exec: (command: Buffer, options?: ExecOptions) => Promise<ExecReturnStruct>
}

export interface ExecOptions {
    statusCallback?: (status: string, statusDetails: StatusCallbackDetails) => void;
}

export type HaloWebMethod = "credential" | "webnfc";

export interface ExecHaloCmdWebOptions extends ExecOptions {
    method?: HaloWebMethod
    noDebounce?: boolean
}

export interface HaloAPICallOptions {
    method?: HaloWebMethod | "pcsc" | "nfc-manager"
}

export interface HaloWebAPICallOptions {
    method?: HaloWebMethod
}

export interface EmptyOptions {

}

export interface RNNFCManagerIsoDepHandler {
    transceive: (data: number[]) => Promise<number[]>;
}

export interface RNNFCManager {
    isoDepHandler: RNNFCManagerIsoDepHandler
}

export interface ExecOptions {
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

export interface KeyFlags {
    isPasswordProtected: boolean
    rawSignCommandNotUsed: boolean
    isImported: boolean
    isExported: boolean
}

export interface KeyState extends KeyFlags {
    failedAuthCounter: number
}

export interface HaloCmdCFGNDEF {
    flagUseText?: boolean
    flagHidePk1?: boolean
    flagHidePk2?: boolean
    flagHidePk3?: boolean
    flagShowPk1Attest?: boolean
    flagShowPk2Attest?: boolean
    flagHideRNDSIG?: boolean
    flagHideCMDRES?: boolean

    flagShowPk3Attest?: boolean
    flagShowLatch1Sig?: boolean
    flagShowLatch2Sig?: boolean
    flagLegacyStatic?: boolean
    flagShowPkN?: boolean
    flagShowPkNAttest?: boolean
    flagRNDSIGUseBJJ62?: boolean

    pkN?: KeySlotNo
}

export interface HaloResCFGNDEF {
    status: "ok"
    cfgBytes: HexString
}

export interface HaloCmdGenKey {
    keyNo: KeySlotNo
    entropy?: HexString
}

export interface HaloResGenKeyV1 {
    needsConfirmPK: true
    publicKey: HexString
}

export interface HaloResGenKeyV2 {
    needsConfirmPK: false
    rootPublicKey: HexString
    rootAttestSig: HexString
}

export type HaloResGenKey = HaloResGenKeyV1 | HaloResGenKeyV2;

export interface HaloCmdGenKeyConfirm {
    keyNo: KeySlotNo
    publicKey: HexString
}

export interface HaloResGenKeyConfirm {
    rootPublicKey: HexString
    rootAttestSig: HexString
}

export interface HaloCmdGenKeyFinalize {
    keyNo: KeySlotNo
    password?: ASCIIString
}

export interface HaloResGenKeyFinalize {
    publicKey: HexString
    attestSig: HexString
}

export type KeySlotNo = number;
export type ASCIIString = string;
export type HexString = string;

export * from './halo/command_types.js';
export * from './types_webnfc.js';
