import { Chain, defineChain } from 'viem'
import {base, baseSepolia, mainnet, sepolia} from "viem/chains";

export const burnerEthereum = defineChain({
    ...mainnet,
    fees: {
        baseFeeMultiplier: 1.2
    },
    rpcUrls: {
        default: {
            http: [process.env.NEXT_PUBLIC_PROVIDER_MAINNET!],
            webSocket: [process.env.NEXT_PUBLIC_PROVIDER_MAINNET_WS!],
        },
    },
})

export const burnerEthereumSepolia = defineChain({
    ...sepolia,
    fees: {
        baseFeeMultiplier: 1.2
    },
    rpcUrls: {
        default: {
            http: [process.env.NEXT_PUBLIC_PROVIDER_SEPOLIA!],
            webSocket: [process.env.NEXT_PUBLIC_PROVIDER_SEPOLIA_WS!],
        },
    },
})

export const burnerBase = defineChain({
    ...base,
    fees: {
        baseFeeMultiplier: 1.2
    },
    rpcUrls: {
        default: {
            http: [process.env.NEXT_PUBLIC_PROVIDER_BASE!],
            webSocket: [process.env.NEXT_PUBLIC_PROVIDER_BASE_WS!],
        },
    },
})

export const burnerBaseSepolia = defineChain({
    ...baseSepolia,
    fees: {
        baseFeeMultiplier: 1.2
    },
    rpcUrls: {
        default: {
            http: [process.env.NEXT_PUBLIC_PROVIDER_BASE_SEPOLIA!],
            webSocket: [process.env.NEXT_PUBLIC_PROVIDER_BASE_SEPOLIA_WS!],
        },
    },
})

export const VIEM_EIP155_CHAINS: Record<string, Chain> = {
  'eip155:1': burnerEthereum,
  'eip155:8453': burnerBase,
  'eip155:11155111': burnerEthereumSepolia,
  'eip155:84532': burnerBaseSepolia,
}
