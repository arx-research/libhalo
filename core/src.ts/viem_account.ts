import {
    Account,
    getAddress,
    GetTransactionType,
    hashMessage,
    hashTypedData,
    Hex,
    isAddressEqual,
    IsNarrowable,
    keccak256,
    parseSignature,
    recoverAddress,
    serializeTransaction,
    SerializeTransactionFn,
    SignableMessage,
    SignTypedDataParameters,
    TransactionSerializable,
    TransactionSerialized,
    TypedDataDefinition
} from 'viem'
import {toAccount} from 'viem/accounts'
import type {TypedData} from 'abitype'
import {HaloResSign, HexString} from "./types.js";

export type TSignDigestCallback = {
    (digest: HexString, subject: unknown): Promise<HaloResSign>;
}

async function _verifySigner(address: Hex, digest: HexString, signature: Hex) {
    const signerAddr = await recoverAddress({hash: ('0x' + digest) as Hex, signature})

    if (!isAddressEqual(signerAddr, address)) {
        throw new Error("Incorrect signer, expected " + address + " but got " + signerAddr)
    }

    return signature
}

export function createViemHaloAccount(address: Hex, signDigestCallback: TSignDigestCallback): Account {
    return toAccount({
        address: getAddress(address),

        async signMessage({message}: { message: SignableMessage }): Promise<Hex> {
            const digest = hashMessage(message).replace('0x', '')
            const haloResSign = await signDigestCallback(digest, {type: "message", message})
            return await _verifySigner(address, digest, haloResSign.signature.ether as Hex)
        },

        async signTransaction<
            serializer extends SerializeTransactionFn<TransactionSerializable> = SerializeTransactionFn<TransactionSerializable>,
            transaction extends Parameters<serializer>[0] = Parameters<serializer>[0],
        >(transaction: transaction, options?: | { serializer?: serializer | undefined } | undefined)
            : Promise<IsNarrowable<TransactionSerialized<GetTransactionType<transaction>>, Hex> extends true
            ? TransactionSerialized<GetTransactionType<transaction>> : Hex> {

            const _serializer = options?.serializer ?? serializeTransaction

            const signableTransaction = (() => {
                // For EIP-4844 Transactions, we want to sign the transaction payload body (tx_payload_body) without the sidecars (ie. without the network wrapper).
                // See: https://github.com/ethereum/EIPs/blob/e00f4daa66bd56e2dbd5f1d36d09fd613811a48b/EIPS/eip-4844.md#networking
                if (transaction.type === 'eip4844')
                    return {
                        ...transaction,
                        sidecars: false,
                    }
                return transaction
            })()

            const digest = keccak256(_serializer(signableTransaction)).replace('0x', '')
            const haloResSign = await signDigestCallback(digest, {type: "transaction", transaction: signableTransaction})
            const parsedSignature = parseSignature(
                await _verifySigner(address, digest, haloResSign.signature.ether as Hex))
            return _serializer(transaction, parsedSignature)
        },

        async signTypedData<
            const typedData extends TypedData | Record<string, unknown>,
            primaryType extends keyof typedData | 'EIP712Domain' = keyof typedData,
        >(parameters: TypedDataDefinition<typedData, primaryType>)
            : Promise<Hex> {

            const {...typedData} = parameters as unknown as SignTypedDataParameters
            const digest = hashTypedData(typedData).replace('0x', '')
            const haloResSign = await signDigestCallback(digest, {type: "typedData", typedData: typedData})
            return await _verifySigner(address, digest, haloResSign.signature.ether as Hex)
        },
    })
}
