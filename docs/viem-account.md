# Using LibHaLo with Viem

## Adding the dependencies

Install the library:

**Using NPM:**
```bash
npm install --save viem
npm install --save @arx-research/libhalo
```
**Using Yarn:**
```bash
yarn add viem
yarn add @arx-research/libhalo
```

## Basic usage
### Retrieve the HaLo key's Ethereum address

First of all, you need to determine which HaLo key slot you want to use (and the corresponding password, if applicable).
Use LibHaLo in order to determine the public key on the target slot, and to calculate the corresponding Ethereum address:

```typescript
import {createViemHaloAccount} from "@arx-research/libhalo/api/common"
import {execHaloCmdWeb} from '@arx-research/libhalo/api/web'
import {HaloResSign, HexString} from "@arx-research/libhalo/types"

const HALO_KEY_NO = 8
const HALO_PASSWORD = "000000"

// 1. Query the HaLo tag for its public key
const keyInfo = await execHaloCmdWeb({
    name: 'get_key_info',
    keyNo: HALO_KEY_NO
}) as HaloResGetKeyInfo

// 2. Convert public key to Ethereum address
const address = publicKeyToAddress(('0x' + keyInfo.publicKey) as Hex)
```

Please note that it is also possible to determine the key slot's public key through other means such as
by reading the dynamic URL, calling `get_data_struct` command or by signing something with the key slot
(the signing operation will return the public key together with the produced signature).

You may skip the above steps if you know the Ethereum address of the target key slot in advance, or if you
can reliably predict it.

### Create Viem HaLo account

Next, you can instantiate an instance of `LocalAccount` using `createViemHaloAccount` helper provided by LibHaLo:
```typescript
import {Account} from "viem"
import {createViemHaloAccount} from "@arx-research/libhalo/api/common"
import {execHaloCmdWeb} from '@arx-research/libhalo/api/web'
import {HaloResSign, HexString} from "@arx-research/libhalo/types"

// 3. Create Viem account
async function haloSignDigest(address: Hex, digest: HexString): Promise<HaloResSign> {
    return await execHaloCmdWeb({
        digest,
        keyNo: HALO_KEY_NO,
        password: HALO_PASSWORD,
    })
}

const account = createViemHaloAccount(
    address,
    async (digest: string, subject: unknown): Promise<HaloResSign> => {
        // you can inspect 'subject' argument to get more insights
        // console.log('Requested to sign:', subject)
        return await haloSignDigest(address, digest)
    }
) as Account
```

### Create Wallet Client

Now you can create Viem's Wallet Client and execute actions that require a signature.

```typescript
import {http, createWalletClient} from "viem"
import {base} from "viem/chains"

// 4. Create Viem Wallet client and supply the created account to it
const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http()
})

// 5. Invoke some action that requires signing
console.log(await walletClient.signMessage({
    message: "test123"
}))
```
