import {Buffer} from 'buffer/index.js';

export interface Reader {
    transmit: (data: Buffer, responseMaxLength: number) => Promise<Buffer>;
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

// TODO proper types for Halo Commands
// eslint-disable-next-line
export type HaloCommandObject = any;
// eslint-disable-next-line
export type HaloResponseObject = any;
// eslint-disable-next-line
export type HaloCommandArgsObject = any;
