import {
  Account,
  Chain,
  createPublicClient,
  createWalletClient,
  EstimateGasParameters,
  Hex,
  http,
  SendTransactionRequest,
  SignableMessage,
  TypedDataDefinition,
} from 'viem'
import { base, EstimateL1FeeParameters, publicActionsL2 } from 'viem/op-stack'
import { createExternalSignerAccount } from '@/src/helpers/viemHaloWallet/externalSignerAccount'
import { haloSignDigest } from '@/src/helpers/viemHaloWallet/haloSignDigest'
import {
  createComethPaymasterClient,
  createSafeSmartAccount,
  createSmartAccountClient,
  ENTRYPOINT_ADDRESS_V07,
} from '@cometh/connect-sdk-4337'

export class ViemHaloWallet<TChain extends Chain> {
  readonly chain: TChain
  readonly mode: 'wallet' | 'giftcard' | undefined

  address: Hex
  signer: Hex | undefined
  account: Account | undefined
  publicClient: any
  walletClient: any
  smartAccountClient: any

  constructor(chain: TChain, address: Hex, mode: 'wallet' | 'giftcard' | undefined) {
    this.chain = chain
    this.address = address
    this.mode = mode
  }

  async init() {
    this.account = createExternalSignerAccount(
      this.address,
      async (digest: Hex): Promise<Hex> => await haloSignDigest(this.signer || this.address, digest)
    ) as Account

    if (this.mode === 'giftcard') {
      this.walletClient = await createSafeSmartAccount({
        apiKey: process.env.NEXT_PUBLIC_COMETH_API_KEY,
        chain: base,
        entryPoint: ENTRYPOINT_ADDRESS_V07,
        signer: this.account,
      })

      const paymasterClient = createComethPaymasterClient({
        transport: http(
          `https://paymaster.cometh.io/${base.id}/?apikey=${process.env.NEXT_PUBLIC_COMETH_API_KEY}`
        ),
        chain: base,
        entryPoint: ENTRYPOINT_ADDRESS_V07,
      })

      this.smartAccountClient = createSmartAccountClient({
        account: this.walletClient,
        entryPoint: ENTRYPOINT_ADDRESS_V07,
        chain: base,
        bundlerTransport: http(
          `https://bundler.cometh.io/${base.id}/?apikey=${process.env.NEXT_PUBLIC_COMETH_API_KEY}`,
          {
            retryCount: 20,
            retryDelay: 2000,
            timeout: 100_000,
          }
        ),
        middleware: {
          sponsorUserOperation: paymasterClient.sponsorUserOperation,
          gasPrice: paymasterClient.gasPrice,
        },
      })
      this.signer = this.address
      this.address = this.walletClient.address
    } else {
      this.walletClient = createWalletClient({
        chain: this.chain,
        account: this.account,
        transport: http(),
      })
    }

    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(),
    }).extend(publicActionsL2())
  }

  async signMessage(message: SignableMessage): Promise<Hex> {
    return await this.walletClient.signMessage({
      account: this.account,
      message,
    })
  }

  async signTypedData(args: TypedDataDefinition): Promise<Hex> {
    return await this.walletClient.signTypedData({
      ...args,
      account: this.account,
    })
  }

  async estimateTxFees(tx: SendTransactionRequest<TChain>) {
    const { maxFeePerGas, maxPriorityFeePerGas } = await this.publicClient.estimateFeesPerGas({
      chain: this.chain,
      type: 'eip1559',
    })

    const gas = await this.publicClient.estimateGas(tx as EstimateGasParameters<TChain>)

    const L1Fee = this.chain.contracts?.gasPriceOracle
      ? ((await this.publicClient.estimateL1Fee(tx as EstimateL1FeeParameters<TChain, undefined>)) *
          BigInt(120)) /
        BigInt(100)
      : BigInt(0)

    const L2Fee = maxFeePerGas * gas

    const totalFees = BigInt(L1Fee) + BigInt(L2Fee)

    return {
      gas,
      maxFeePerGas,
      maxPriorityFeePerGas,
      totalFees,
      L1Fee,
      L2Fee,
    }
  }
}
