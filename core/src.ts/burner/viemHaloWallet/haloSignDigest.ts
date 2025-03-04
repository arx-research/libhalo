import { Hex } from 'viem'
import { getAccount, getSavedData, saveData } from '@/src/helpers/savedData'
import haloConnStore from '@/src/stores/haloConnStore'
import handleError from '@/src/helpers/handleError'
import { computeAddress } from 'ethers'
import { HaloTagError } from '@arx-research/libhalo/api/common'

export async function haloSignDigest(address: string, digest: Hex): Promise<Hex> {
  let res

  // Find the correct account
  const data = getAccount(address)
  if (!data) throw new Error('Missing account in halo wallet')

  try {
    res = await haloConnStore.getState().halo.sign({
      keyNo: data.keyNumber!,
      digest: digest.replace('0x', ''),
      password: data.keyNumber !== 4 ? data.pin : undefined,
    })
  } catch (e) {
    if (e instanceof HaloTagError) {
      if (e.name === "ERROR_CODE_WRONG_PWD") {
        // delete saved PIN if the card said it was wrong
        saveData({
          ...getSavedData(),
          pin: undefined
        })
      }
    }

    handleError(e)
    throw e
  }

  let signAddr = computeAddress('0x' + res.publicKey)

  if (signAddr !== address) {
    throw new Error('This Burner card does not belong to the currently active account.')
  }

  return res.signature.ether as Hex
}
