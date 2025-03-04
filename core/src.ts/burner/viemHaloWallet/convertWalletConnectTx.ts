import { Chain, SendTransactionParameters } from 'viem'

function toNumber(val: any) {
  if (typeof val !== "string" && typeof val !== "number") {
    throw new Error("Value must be a string or number.")
  }

  if (typeof val === "string") {
    if (val === "") {
      throw new Error("Value can not be an empty string.")
    } else if (val === "0x") {
      return 0
    }

    return parseInt(val)
  }

  return val
}

function toBigInt(val: any) {
  if (typeof val !== "string" && typeof val !== "number" && typeof val !== "bigint") {
    throw new Error("Value must be a string, number or bigint.")
  }

  if (typeof val === "string") {
    if (val === "") {
      throw new Error("Value can not be an empty string.")
    } else if (val === "0x") {
      return BigInt(0)
    }
  }

  return BigInt(val)
}

export function convertWalletConnectTx<TChain extends Chain>(tx: Record<string, any>): SendTransactionParameters<TChain> {
  let out: Record<string, unknown> = {}

  const intKeys = ["chainId", "nonce"]
  const bnKeys = ["gas", "gasLimit", "gasPrice", "maxFeePerGas", "maxPriorityFeePerGas", "maxFeePerBlobGas", "value"]
  const passThruKeys = ["data", "from", "to", "input"]

  for (const origKey of Object.keys(tx)) {
    let newKey = origKey

    if (origKey === "gasLimit") {
      newKey = "gas"
    }

    if (out.hasOwnProperty(newKey)) {
      throw new Error("Duplicate tx key: " + newKey)
    }

    if (intKeys.indexOf(origKey) !== -1) {
      out[newKey] = toNumber(tx[origKey])
    } else if (bnKeys.indexOf(origKey) !== -1) {
      out[newKey] = toBigInt(tx[origKey])
    } else if (passThruKeys.indexOf(origKey) !== -1) {
      out[newKey] = tx[origKey]
    } else {
      throw new Error("Unsupported transaction key: " + origKey)
    }
  }

  return out as SendTransactionParameters<TChain>
}
