import elliptic from 'elliptic'

function hex2arr(hexString: string) {
    const matchResult = hexString.match(/.{1,2}/g)
    if (!matchResult) {
        throw new Error('Invalid hex string')
    }
    return new Uint8Array(matchResult.map((byte) => parseInt(byte, 16)))
}

async function verifyAttestPK2(
    pk2: string,
    pk2Attest: string
) {
    const roots = [
        // ArxHaloSigningKey1 2024-03-21
        '029502cb849e4d9e451687a239f3feee74e0c0cdebb10dc8c2a00b3744ffdafb35'
    ]

    const headerBytes = new TextEncoder().encode('\x19Attest pk2:\n')
    const publicKeyBytes = hex2arr(pk2)
    const data = [
        ...Array.from(headerBytes),
        ...Array.from(publicKeyBytes),
    ]

    for (const root of roots) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', Uint8Array.from(data))
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

        const ec = new elliptic.ec('secp256k1')
        const key = ec.keyFromPublic(root, 'hex')
        const signature = Buffer.from(pk2Attest, "hex").subarray(2)

        if (key.verify(hashHex, signature)) {
            return true;
        }
    }

    return false;
}

async function verifyAttest(
    pk2: string,
    keyNo: string,
    publicKey: string,
    publicKeyAttest: string
) {
    // Generate message
    const headerBytes = new TextEncoder().encode('\x19Key attest:\n')
    const keyNoBytes = hex2arr(keyNo)

    const publicKeyBytes = hex2arr(publicKey)
    const data = [
        ...Array.from(headerBytes),
        ...Array.from(keyNoBytes),
        ...Array.from(publicKeyBytes),
    ]

    const hashBuffer = await crypto.subtle.digest('SHA-256', Uint8Array.from(data))
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

    const ec = new elliptic.ec('secp256k1')
    const key = ec.keyFromPublic(pk2, 'hex')
    const signature = hex2arr(publicKeyAttest)
    return key.verify(hashHex, signature)
}

async function run() {
    // verify pk2 attestation
    console.log('is PK2 certified by Arx key?', await verifyAttestPK2(
        // public key 2
        '04a40782ab75cb628c25284af2d05e27048de0a986cf416996aabb2c40753463d84c0831e1c6994627c331f22345ebad418ecd053fa6e66907fa5472e2c343c241',
        // attest of public key 2
        '02a1304402206226e4a5bec33e387352bf1f40a2cf430472236a7c2cba0aa574d4df698f409e02202d6b20d29df48db9051b80aca7ce83934f2a5f128a09e684f8b60e487dc63e5a'
    ));

    // verify any other key attestation
    console.log('is PK1 certified by PK2?', await verifyAttest(
        // public key 2
        '04a40782ab75cb628c25284af2d05e27048de0a986cf416996aabb2c40753463d84c0831e1c6994627c331f22345ebad418ecd053fa6e66907fa5472e2c343c241',
        // key no = 1
        '01',
        // public key 1
        '041956eaed20ffc3f1f54e0beca865d2ce795fa422bf9e245a3a060f6c211515e1b3782bb72602d96e9857216f22830891c7e5714d30d40c0624c7c61433237d89',
        // attest of public key 1
        '30440220321127f00ef9b5bbf322d9f6ae254253495ea2aea90c20f8d48785de4c417c820220353495a3a9c246d75fcb39f64ab23103a1823035d05127f27964153b52acee22'
    ));
}

run();
