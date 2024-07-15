import {ASCIIString, HexString, KeySlotNo, PublicKeyList} from "../types.js";
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

// TODO refactor
export interface HaloResGetDataStruct {
    isPartial: boolean
    data: Record<string, unknown>
}

export interface HaloCmdGetGraffiti {
    slotNo: number,
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
