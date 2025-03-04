import {
    getAddress,
    GetTransactionType,
    hashMessage,
    hashTypedData,
    Hex,
    IsNarrowable,
    keccak256,
    parseSignature,
    serializeTransaction,
    SerializeTransactionFn,
    SignableMessage,
    SignTypedDataParameters,
    TransactionSerializable,
    TransactionSerialized,
    TypedDataDefinition,
} from 'viem'
import { toAccount } from 'viem/accounts'
import type { TypedData } from 'abitype'

export type TSignDigestCallback = {
    (digest: Hex): Promise<Hex>;
}


export function createExternalSignerAccount(address: string, signDigestCallback: TSignDigestCallback) {
    return toAccount({
        address: getAddress(address),

        async signMessage({ message }: { message: SignableMessage }): Promise<Hex> {
            return await signDigestCallback(hashMessage(message))
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

            const digest = keccak256(_serializer(signableTransaction))
            const signature = parseSignature(await signDigestCallback(digest) as Hex)
            return _serializer(transaction, signature)
        },

        async signTypedData<
            const typedData extends TypedData | Record<string, unknown>,
            primaryType extends keyof typedData | 'EIP712Domain' = keyof typedData,
        >(parameters: TypedDataDefinition<typedData, primaryType>)
            : Promise<Hex> {

            const { ...typedData } = parameters as unknown as SignTypedDataParameters
            const digest = hashTypedData(typedData)
            return await signDigestCallback(digest)
        },
    })
}
