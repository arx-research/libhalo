# Utility functions exposed by LibHaLo

## haloParsePublicKeys

Parse the binary blob which is returned from the dynamic URL's `static` parameter for earlier batches of tags.

**Prototype:**
All parameters should be hex-encoded strings.

```javascript
haloParsePublicKeys(queryParamStatic);
```

**Example function call:**
```javascript
import {haloParsePublicKeys} from '@arx-research/libhalo/api/common.js';

let pkeys = haloParsePublicKeys(
    "4104453D40D28E0BAA4D98AC86549DDC5FFFF5F674481A47141137F8A82CB666937A67AECE33B96E" +
    "5968FF2728E8203A4B1F59465F53A9B2714733C0C4300F7662C8410463E500A08F3D237303C19069D49C20" +
    "03D2A9F92EF46370BD9898BDC7C3AE9DB98FA47824E1EEBA7867C03831681FDE5F34C82247F0A0C1F2A841" +
    "53DE933C963E00000000000000000000000000000000000000000000000000000000000000000000000000" +
    "0000000000000000000000000000000000000000000000000000000000");
```

**Example return value:**
```javascript
{
  '1': '04453d40d28e0baa4d98ac86549ddc5ffff5f674481a47141137f8a82cb666937a67aece33b96e5968ff2728e8203a4b1f59465f53a9b2714733c0c4300f7662c8',
  '2': '0463e500a08f3d237303c19069d49c2003d2a9f92ef46370bd9898bdc7c3ae9db98fa47824e1eeba7867c03831681fde5f34c82247f0a0c1f2a84153de933c963e' 
}
```

## haloConvertSignature

Convert the input digest, public key and DER-encoded signature into Ethereum-style signature string, or
raw point format with recovery parameter.

**Prototype:**
All parameters should be hex-encoded strings.

```javascript
haloConvertSignature(digest, derSignature, publicKey, curveOrder);
```

**Example usage:**
```javascript
import {execHaloCmdWeb} from '@arx-research/libhalo/api/web.js';
import {haloConvertSignature, SECP256k1_ORDER} from '@arx-research/libhalo/api/common.js';

const KEY_NO = 1;

let pkeysRes = await execHaloCmdWeb({"name": "get_pkeys"});
let signRes = await execHaloCmdWeb({
    "name": "sign",
    "message": "010203",
    "keyNo": KEY_NO,
    "legacySignCommand": true
});
let publicKey = pkeysRes.publicKeys[KEY_NO];

let res = haloConvertSignature(signRes.input.digest, signRes.signature.der, publicKey, SECP256k1_ORDER);

// Ethereum-style signature (string)
console.log('ether', res.ether);
// Raw point-format signature with recovery param
console.log('raw', res.raw);
```

**Example function call:**
```javascript
haloConvertSignature(
    "bcf83051a4d206c6e43d7eaa4c75429737ac0d5ee08ee68430443bd815e6ac05",
    "3046022100fb2ee8172a6cb2615276bcc7e7a56f1c299b93192b3af61406ffd8356c730309022100e4f501b6768ddb5ff62498eae066b9cad77fe3ecb961162050ed57ea7df7a855",
    "04e2b8ec92be2ed99962470555b31f094a1862d7fa3fb8a5de1f4d7f475bd93ffb27d7295e94ac11e8fa67b70582df375fc660c5e36078e83f7a1e9f7e6ae08142",
    SECP256k1_ORDER
);
```

**Example return value:**
```javascript
{
    "raw": {
        "r": "fb2ee8172a6cb2615276bcc7e7a56f1c299b93192b3af61406ffd8356c730309",
        "s": "1b0afe49897224a009db67151f994633e32ef8f9f5e78a1b6ee506a2523e98ec",
        "v": 28
    },
    "der": "3046022100fb2ee8172a6cb2615276bcc7e7a56f1c299b93192b3af61406ffd8356c730309022100e4f501b6768ddb5ff62498eae066b9cad77fe3ecb961162050ed57ea7df7a855",
    "ether": "0xfb2ee8172a6cb2615276bcc7e7a56f1c299b93192b3af61406ffd8356c7303091b0afe49897224a009db67151f994633e32ef8f9f5e78a1b6ee506a2523e98ec1c"
}
```

## haloRecoverPublicKey

Take the signed message digest and the resulting signature, compute two public key candidates.

**Prototype:**
All parameters should be hex-encoded strings.

```javascript
haloRecoverPublicKey(digest, derSignature, curveOrder);
```

**Example usage:**
```javascript
import {execHaloCmdWeb} from '@arx-research/libhalo/api/web.js';
import {haloRecoverPublicKey, SECP256k1_ORDER} from '@arx-research/libhalo/api/common.js';

const KEY_NO = 1;

let signRes = await execHaloCmdWeb({
    "name": "sign",
    "message": "010203",
    "keyNo": KEY_NO,
    "legacySignCommand": true
});

// this will return two public keys
// one of them will be actually the tag's public key
console.log(haloRecoverPublicKey(signRes.input.digest, signRes.signature.der, SECP256k1_ORDER));
```

**Example function call:**
```javascript
haloRecoverPublicKey(
    "bcf83051a4d206c6e43d7eaa4c75429737ac0d5ee08ee68430443bd815e6ac05",
    "3046022100fb2ee8172a6cb2615276bcc7e7a56f1c299b93192b3af61406ffd8356c730309022100e4f501b6768ddb5ff62498eae066b9cad77fe3ecb961162050ed57ea7df7a855",
    SECP256k1_ORDER
);
```

**Example return value:**
```javascript
[
  '04c057b11fd0ecaad8decc4df64de9b95d1b41fad96017c82d809eabc5240fa7d9cac3d65e1412d5f103598f1541eaeb6e27dc401b6a873576322cfd73074aebd8',
  '04e2b8ec92be2ed99962470555b31f094a1862d7fa3fb8a5de1f4d7f475bd93ffb27d7295e94ac11e8fa67b70582df375fc660c5e36078e83f7a1e9f7e6ae08142' 
]
```

## haloGetDefaultMethod

For websites: detect the best command execution method for the current device.
Returns a string that could be passed directly as `options.method` key for `execHaloCmdWeb()` function.

```javascript
haloGetDefaultMethod();
```

**Example usage:**
```
import {execHaloCmdWeb} from '@arx-research/libhalo/api/web.js';
import {haloGetDefaultMethod} from '@arx-research/libhalo/api/common.js';

let signRes = await execHaloCmdWeb({
    "name": "sign",
    "message": "010203",
    "keyNo": 1,
    "legacySignCommand": true
}, {
    "method": haloGetDefaultMethod()
});
```
