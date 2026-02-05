import {ASCIIString, HaloCmdCFGNDEF, HexString, KeyFlags, KeySlotNo, KeyState, PublicKeyList} from "../types.js";
import {TypedDataDomain, TypedDataField} from "ethers";

export type HaloCmdGetPkeys = Record<string, never>

export interface HaloResGetPkeys {
    publicKeys: PublicKeyList
    compressedPublicKeys: PublicKeyList
    etherAddresses: PublicKeyList
}


export interface BaseHaloCmdSign {
    keyNo: KeySlotNo
    format?: "text" | "hex"
    password?: ASCIIString
    rawPwdDigest?: ASCIIString

    legacySignCommand?: boolean
    skipPostprocessing?: boolean
}

export interface HaloCmdSignVariant1 extends BaseHaloCmdSign {
    digest: HexString
    message?: undefined
    typedData?: undefined
}

export interface HaloCmdSignVariant2 extends BaseHaloCmdSign {
    digest?: undefined
    message: HexString
    typedData?: undefined
}

export interface HaloCmdSignVariant3 extends BaseHaloCmdSign {
    digest?: undefined
    message?: undefined
    typedData: {
        domain: TypedDataDomain
        types: Record<string, Array<TypedDataField>>
        value: Record<string, never>
    }
}

export type HaloCmdSign = HaloCmdSignVariant1 | HaloCmdSignVariant2 | HaloCmdSignVariant3;

export interface HaloResInputObj {
    keyNo: KeySlotNo
    digest: HexString
    message?: HexString
    typedData?: {
        domain: TypedDataDomain
        types: Record<string, Array<TypedDataField>>
        value: Record<string, never>
        primaryType: string
        domainHash: string
    }
}

export interface HaloResSign {
    input: HaloResInputObj
    signature: {
        der: HexString
        raw?: {
            r: string
            s: string
            v: number
        }
        ether?: string
    }
    publicKey?: string
    etherAddress?: string
}

export interface HaloCmdGetDataStruct {
    spec: string
}

export interface HaloResGetDataStruct {
    _deprecationMessage: string
    isPartial: boolean
    data: Record<string, ASCIIString | HexString | number | StructErrorResponse | KeyFlags | null>
}

export type DataStructObjectType =
    "publicKey"
    | "publicKeyAttest"
    | "keySlotFlags"
    | "keySlotFailedAuthCtr"
    | "compressedPublicKey"
    | "keySlotAuthFailState"
    | "keySlotAuthUnlockChallenge"
    | "latchValue"
    | "latchAttest"
    | "graffiti"
    | "firmwareVersion";

export type DataStructErrorType =
    "resultBufferOverflow"
    | "keySlotOutOfBounds"
    | "keySlotNotGenerated"
    | "latchNotSet"
    | "latchAttestNotSet"
    | "authFailStateInvalid"
    | `unknown_${string}`;

export interface HaloCmdGetDataStructV2 {
    spec: {
        type: DataStructObjectType,
        index: number
    }[]
}

type ObjectIndex = number
type Satisfies<T, U extends T> = U
type DataStructObjectValue<T> = {value: T} | {error: DataStructErrorType}
type DataStructObjectValues<T> = Record<ObjectIndex, DataStructObjectValue<T>>

export type KeySlotAuthFailLevel = 'unrestricted' | 'softlocked' | 'softlocked-hw' | 'lockout';

export interface KeySlotAuthFailState {
    authPermitted: boolean,
    failLevel: KeySlotAuthFailLevel
}

export type HaloResGetDataStructV2 = Satisfies<Record<DataStructObjectType, DataStructObjectValues<unknown>>, {
    publicKey: DataStructObjectValues<HexString>,
    publicKeyAttest: DataStructObjectValues<HexString>,
    keySlotFlags: DataStructObjectValues<KeyFlags>,
    keySlotFailedAuthCtr: DataStructObjectValues<number>,
    compressedPublicKey: DataStructObjectValues<HexString>,
    keySlotAuthFailState: DataStructObjectValues<KeySlotAuthFailState>,
    keySlotAuthUnlockChallenge: DataStructObjectValues<HexString>,
    latchValue: DataStructObjectValues<HexString>,
    latchAttest: DataStructObjectValues<HexString>,
    graffiti: DataStructObjectValues<string>,
    firmwareVersion: DataStructObjectValues<string>,
}>

export interface StructErrorResponse {
    error: string
}

export interface HaloCmdGetGraffiti {
    slotNo: number
}

export interface HaloResGetGraffiti {
    data: ASCIIString
}

export interface HaloCmdStoreGraffiti {
    slotNo: number,
    data: ASCIIString
}

export interface HaloResStoreGraffiti {
    status: "ok"
}

export interface HaloCmdWriteLatch {
    data: HexString
    latchNo: number
}

export interface HaloResWriteLatch {
    status: "ok"
}

export interface HaloCmdSignRandom {
    keyNo: KeySlotNo
}

export interface HaloResSignRandom {
    counter: number
    payload: HexString
    signature: HexString
    publicKey: HexString
}

export interface HaloCmdSignChallenge {
    keyNo: KeySlotNo
    challenge: HexString
}

export interface HaloResSignChallenge {
    signature: HexString
    publicKey: HexString
    attestSig: HexString
}

export interface HaloCmdImportKeyInit {
    keyNo: KeySlotNo
    data: HexString
}

export interface HaloResImportKeyInit {
    status: "ok"
}

export interface HaloCmdImportKey {
    keyNo: KeySlotNo
}

export interface HaloResImportKey {
    publicKey: HexString
}

export interface HaloCmdExportKey {
    keyNo: KeySlotNo
    password: ASCIIString
    data: HexString
}

export interface HaloResExportKey {
    data: HexString
}

export type HaloCmdGetTransportPK = Record<string, never>;

export interface HaloResGetTransportPK {
    data: HexString
    rootPublicKey: HexString
}

export interface HaloCmdLoadTransportPK {
    data: HexString
}

export interface HaloResLoadTransportPK {
    data: HexString
    rootPublicKey: HexString
}

export interface HaloCmdSetPassword {
    password: ASCIIString
    keyNo: KeySlotNo
}

export interface HaloResSetPassword {
    status: "ok"
}

export interface HaloCmdUnsetPassword {
    password: ASCIIString
    keyNo: KeySlotNo
}

export interface HaloResUnsetPassword {
    status: "ok"
}

export interface HaloCmdReplacePassword {
    currentPassword: ASCIIString
    newPassword: ASCIIString
    keyNo: KeySlotNo
}

export interface HaloResReplacePassword {
    status: "ok"
}

export interface HaloCmdGetKeyInfo {
    keyNo: KeySlotNo
}

export interface HaloResGetKeyInfo {
    keyState: KeyState
    publicKey: HexString
    attestSig: HexString
}

export interface HaloCmdSetURLSubdomain {
    subdomain: ASCIIString
    allowSignatureDER: HexString
}

export interface HaloResSetURLSubdomain {
    status: "ok"
}

export type HaloCmdReplacePasswordStoreGraffiti = HaloCmdReplacePassword & HaloCmdStoreGraffiti;
export type HaloCmdCFGNDEFStoreGraffiti = HaloCmdCFGNDEF & HaloCmdStoreGraffiti;

export interface HaloResReplacePasswordStoreGraffiti {
    status: "ok"
}

export interface HaloResCFGNDEFStoreGraffiti {
    status: "ok"
}

export interface HaloCmdUnlockOnline {
    keyNo: KeySlotNo
    unlockSig: ASCIIString
}

export interface HaloResUnlockOnline {
    status: "ok"
}
