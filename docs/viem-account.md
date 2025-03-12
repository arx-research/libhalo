# Using HaLo with Viem

```
import {createViemHaloAccount} from "@arx-research/libhalo/api/common";
import {execHaloCmdWeb} from '@arx-research/libhalo/api/web';
import {HaloResSign, HexString} from "@arx-research/libhalo/types";

const HALO_KEY_NO = 8;
const HALO_PASSWORD = "000000";

async function haloSignDigest(address: Hex, digest: HexString): Promise<HaloResSign> {
    return await execHaloCmdWeb({
        digest,
        keyNo: HALO_KEY_NO,
        password: HALO_PASSWORD,
    })
}

const account = createViemHaloAccount(
    address,
    async (digest: string): Promise<HaloResSign> => await haloSignDigest(address, digest)
)

// the "account" is ready to be used with Viem wallet/public clients
```
