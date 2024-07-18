import {ASCIIString, HexString, KeyFlags, KeySlotNo, KeyState, PublicKeyList} from "../types.js";
import {TypedDataDomain, TypedDataField} from "ethers";

export interface HaloCmdGetPkeys {}

export interface HaloResGetPkeys {
    publicKeys: PublicKeyList
    compressedPublicKeys: PublicKeyList
    etherAddresses: PublicKeyList
}


export interface BaseHaloCmdSign {
    keyNo: KeySlotNo
    format?: "text" | "hex"
    password?: ASCIIString

    legacySignCommand?: boolean
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
    isPartial: boolean
    data: Record<string, unknown>
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

export interface HaloCmdGetTransportPK {

}

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
