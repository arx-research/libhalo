
```
async function haloSignDigest(address: Hex, digest: HexString): Promise<HaloResSign> {
    return await execHaloCmdWeb({
        digest,
        keyNo: 8,
        password: '000000',
    })
}

function createHaloAccount(address) {
    return createExternalSignerAccount(
        address,
        async (digest: Hex): Promise<Hex> => await haloSignDigest(address, digest)
    )
}
```
