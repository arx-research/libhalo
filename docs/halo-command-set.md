# HaLo Command Set

## Table of contents

* [Feature compatibility](#feature-compatibility)
* [Command: sign](#command-sign)
* [Command: sign_random](#command-sign_random)
* [Command: sign_challenge](#command-sign_challenge)
* [Command: write_latch](#command-write_latch)
* [Command: cfg_ndef](#command-cfg_ndef)
* [Command: gen_key](#command-gen_key)
* [Command: gen_key_confirm](#command-gen_key_confirm)
* [Command: get_pkeys](#command-get_pkeys)
* [Command: get_key_info](#command-get_key_info)
* [Command: set_password](#command-set_password)
* [Command: unset_password](#command-unset_password)
* [Command: get_data_struct](#command-get_data_struct)
* [Command: get_graffiti](#command-get_graffiti)
* [Command: store_graffiti](#command-store_graffiti)
* [Command: version (only for PCSC/React Native)](#command-version)
* [Command: read_ndef (only for PCSC/React Native)](#command-read_ndef)
* [Command: pcsc_detect (only with CLI tool)](#command-pcsc_detect)

## Feature compatibility

Certain HaLo features might not be supported with the earlier versions of tags.

Please check [HaLo Tag Firmware Versions](/docs/firmware-versions.md) for the detailed compatibility table.

## Command: sign

Sign an arbitrary message using EIP-191 (version 0x45) algorithm, typed data (EIP-712), or sign a raw digest using plain ECDSA (secp256k1) algorithm. This command could use tag's private key slot #1 or #3.

### Arguments
* `message` (str) - the hex-encoded message to be signed as an Ethereum EIP-191 personal message (personal_sign);
* `format` (str) - optional; format of the `message` argument, either `hex` (default) or `text`;
* `digest` (str) - the raw hex-encoded 32 byte digest to be signed using plain ECDSA;
* `typedData` (object) - EIP-712 typed data to be signed, should contain sub-keys: `domain`, `types`, `value`;
* `keyNo` (int) - number of the key slot to use;
* `password` (str) - optional; password for the target key slot as utf-8 string;
* `publicKeyHex` (str) - optional; the public key of the target key slot, only required when providing `password`, uncompressed, hex encoded;
* `legacySignCommand` (bool) - optional; whether to use legacy command for signing, see the note below;

**Note:** You should specify exactly one of the following keys: `message`, `digest` or `typedData`.

**Note:** Set `legacySignCommand` to `true` if your tags are generating dynamic URLs
without `v` (version) query string parameter or the `v` parameter is lower than `01.C4` (by lexicographical comparison).
Don't use `legacySignCommand` if all your tags have `v=01.C4` or higher.

### Return value
* `input.keyNo` - number of the requested key slot;
* `input.digest` - the digest that was uploaded to the HaLo tag for signing (32 bytes, hex encoded);
* `input.message` - (optional) the message that was used to compute the Keccak digest (hex encoded);
* `signature.raw` - raw signature in the (r, s, v) format, where `v` is a recovery param (values: 27 or 28);
* `signature.der` - DER encoded signature (hex encoded);
* `signature.ether` - Ethereum-formatted signature;
* `publicKey` - the public key corresponding to the requested key slot (65 bytes, hex encoded, uncompressed);
* `etherAddress` - the Ethereum address corresponding to the requested key slot;

### Examples
#### Message signing (EIP-191)
Sign bytes `[0x01, 0x02, 0x03]` using EIP-191 (personal_sign).

Command:
```json
{
  "name": "sign",
  "message": "010203",
  "keyNo": 1
}
```

Response:
```json
{
  "input": {
    "keyNo": 1,
    "digest": "bcf83051a4d206c6e43d7eaa4c75429737ac0d5ee08ee68430443bd815e6ac05",
    "message": "010203"
  },
  "signature": {
    "raw": {
      "r": "93137bc7bfeaa86e26c6a9bbd6fb8acdf73ed5fd232cc2be1a0714f583f04d2e",
      "s": "7f5d7c2461daf8649587c3c510fce05a74146cbe79341427065d0d878d154a1b",
      "v": 27
    },
    "der": "304602210093137bc7bfeaa86e26c6a9bbd6fb8acdf73ed5fd232cc2be1a0714f583f04d2e02210080a283db9e25079b6a783c3aef031fa4469a702836148c14b97551054320f726",
    "ether": "0x93137bc7bfeaa86e26c6a9bbd6fb8acdf73ed5fd232cc2be1a0714f583f04d2e7f5d7c2461daf8649587c3c510fce05a74146cbe79341427065d0d878d154a1b1b"
  },
  "publicKey": "046ca7458b4c8c4f9a196094bda5f01ac1e588f6604bc2f7a58ba4d1fa3c3cb9102720bdb43f73972ea3dfc1c6ab8a6cb7d14114765eb76ff0fb2df34a5f7cab56",
  "etherAddress": "0x1aaBF638eC3c4A5C2D5cD14fd460Fee2c364c579"
}
```

Verification using ethers.js:
```
let res = ethers.utils.verifyMessage(
  Buffer.from("010203", "hex"),
  '0x93137bc7bfeaa86e26c6a9bbd6fb8acdf73ed5fd232cc2be1a0714f583f04d2e7f5d7c2461daf8649587c3c510fce05a74146cbe79341427065d0d878d154a1b1b'
);

console.log(res); // will print: 0x1aaBF638eC3c4A5C2D5cD14fd460Fee2c364c579
```

#### Typed data signing (EIP-712)
Sign typed data according to EIP-712.

Command:
```json
{
  "name": "sign",
  "keyNo": 1,
  "typedData": {
    "domain": {
      "name": "Ether Mail",
      "version": "1",
      "chainId": 1,
      "verifyingContract": "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"
    },
    "types": {
      "Person": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "wallet",
          "type": "address"
        }
      ],
      "Mail": [
        {
          "name": "from",
          "type": "Person"
        },
        {
          "name": "to",
          "type": "Person"
        },
        {
          "name": "contents",
          "type": "string"
        }
      ]
    },
    "value": {
      "from": {
        "name": "Cow",
        "wallet": "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826"
      },
      "to": {
        "name": "Bob",
        "wallet": "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB"
      },
      "contents": "Hello, Bob!"
    }
  }
}
```

Response:
```json
{
  "input": {
    "keyNo": 1,
    "digest": "be609aee343fb3c4b28e1df9e632fca64fcfaede20f02e86244efddf30957bd2",
    "typedData": {
      "domain": {
        "name": "Ether Mail",
        "version": "1",
        "chainId": 1,
        "verifyingContract": "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"
      },
      "types": {
        "Person": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "wallet",
            "type": "address"
          }
        ],
        "Mail": [
          {
            "name": "from",
            "type": "Person"
          },
          {
            "name": "to",
            "type": "Person"
          },
          {
            "name": "contents",
            "type": "string"
          }
        ]
      },
      "value": {
        "from": {
          "name": "Cow",
          "wallet": "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826"
        },
        "to": {
          "name": "Bob",
          "wallet": "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB"
        },
        "contents": "Hello, Bob!"
      }
    },
    "primaryType": "Mail",
    "domainHash": "f2cee375fa42b42143804025fc449deafd50cc031ca257e0b194a650a912090f"
  },
  "signature": {
    "raw": {
      "r": "e08869b150de98d3dbbe53628851bf0fa8107442695edb802f521fdc845e6fd4",
      "s": "62f5045d28941b187cda1960365d24dc0e3b648fc6211dc60c0040daafa8a9bd",
      "v": 27
    },
    "der": "3046022100e08869b150de98d3dbbe53628851bf0fa8107442695edb802f521fdc845e6fd40221009d0afba2d76be4e78325e69fc9a2db22ac737856e9278275b3d21db2208d9784",
    "ether": "0xe08869b150de98d3dbbe53628851bf0fa8107442695edb802f521fdc845e6fd462f5045d28941b187cda1960365d24dc0e3b648fc6211dc60c0040daafa8a9bd1b"
  },
  "publicKey": "042c061312771f471910ef8a3a437ac89f6ff81b2aeb0e3f5dcc2dd15d0d9d1fd7b48dba2ec753f0f70ea9b9a85df8a16e664546c9f7bad2be38e08eec63b916c7",
  "etherAddress": "0xd1c1062019d80cbb68df2920859df6C66Cfa52eC"
}
```

#### Raw digest signing
> Web example: [LibHaLo Demos - demo.html](https://halo-demos.arx.org/examples/demo.html) ([source code](https://github.com/arx-research/libhalo/blob/master/web/examples/demo.html))

Sign arbitrary 32-byte digest using plain ECDSA asymmetric cipher.

Command:
```json
{
    "name": "sign",
    "keyNo": 1,
    "digest": "0102030401020304010203040102030401020304010203040102030401020304"
}
```

Response:
```json
{
    "input": {
        "keyNo": 1,
        "digest": "0102030401020304010203040102030401020304010203040102030401020304"
    },
    "signature": {
        "raw": {
            "r": "c1546b135afaaca445ea627057f3d3660ab94c98a4a0cf7b70ec7cc065728d77",
            "s": "553a730ff2c534ee917d21559277aa15d9e1a339f643d6f285763214caf869c0",
            "v": 27
        },
        "der": "3046022100c1546b135afaaca445ea627057f3d3660ab94c98a4a0cf7b70ec7cc065728d77022100aac58cf00d3acb116e82deaa6d8855e8e0cd39acb904c9493a5c2c78053dd781",
        "ether": "0xc1546b135afaaca445ea627057f3d3660ab94c98a4a0cf7b70ec7cc065728d77553a730ff2c534ee917d21559277aa15d9e1a339f643d6f285763214caf869c01b"
    },
    "publicKey": "046ca7458b4c8c4f9a196094bda5f01ac1e588f6604bc2f7a58ba4d1fa3c3cb9102720bdb43f73972ea3dfc1c6ab8a6cb7d14114765eb76ff0fb2df34a5f7cab56",
    "etherAddress": "0x1aaBF638eC3c4A5C2D5cD14fd460Fee2c364c579"
}
```

#### Raw digest signing using password-protected key #3 slot
Command:
```json
{
    "name": "sign",
    "keyNo": 3,
    "digest": "0102030401020304010203040102030401020304010203040102030401020304",
    "publicKeyHex": "049d1e9cd828fcea59cfee261c705ed84023103537aea7069fe001129cdf69e60bc0c6de184cc0e6a5b396c19a4450e94dafa9dc87b6a527e60aa2104bb253933e",
    "password": "abc123"
}
```

Response:
```json
{
    "input": {
        "keyNo": 3,
        "digest": "0102030401020304010203040102030401020304010203040102030401020304"
    },
    "signature": {
        "raw": {
            "r": "9ffb5e0c4c0e97b36af5e62bb7ca8641862e883cc50668b42017c6b42d536b41",
            "s": "30386182eedf45e7887cc7710c657475d8bcdbb9cf77c69950313d8ccfb76484",
            "v": 28
        },
        "der": "30460221009ffb5e0c4c0e97b36af5e62bb7ca8641862e883cc50668b42017c6b42d536b41022100cfc79e7d1120ba187783388ef39a8b88e1f2012cdfd0d9a26fa12100007edcbd",
        "ether": "0x9ffb5e0c4c0e97b36af5e62bb7ca8641862e883cc50668b42017c6b42d536b4130386182eedf45e7887cc7710c657475d8bcdbb9cf77c69950313d8ccfb764841c"
    },
    "publicKey": "049d1e9cd828fcea59cfee261c705ed84023103537aea7069fe001129cdf69e60bc0c6de184cc0e6a5b396c19a4450e94dafa9dc87b6a527e60aa2104bb253933e",
    "etherAddress": "0x04C147798dB0f016223cB371c06Fb03f706f918d"
}
```

### Errors
* `ERROR_CODE_INVALID_KEY_NO` - invalid key number provided or the key slot doesn't support this operation;
* `ERROR_CODE_KEY_NOT_INITIALIZED` - targeted key is not initialized yet;
* `ERROR_CODE_INVALID_LENGTH` - trying to sign a digest which is not 32 bytes long;
* `ERROR_CODE_INVALID_DATA` - trying to use the standard sign command (without password) against the password-protected slot;
* `ERROR_CODE_WRONG_PWD` - wrong password provided for the target key slot;

### Note on message hashing

When you provide the `command.message` key, the message will be hex-decoded and hashed using Ethereum's hashing algorithm.
Namely, the message will be prepended by `"b\x19Ethereum Signed Message:\n" + len(message)`, hashed using
Keccak-256 algorithm, and the resulting digest will be sent to the NFC tag in order to perform signing operation.

**Example:**
* Input message (text): `test`
* **Input message (hex):** `74657374`
* Message length: 4
* Prefixed message (text): `b'\x19Ethereum Signed Message:\n4test'`
* Prefixed message (hex): `19457468657265756d205369676e6564204d6573736167653a0a3474657374`
* **Prefixed message hashed with Keccak-256 (hex):** `4a5c5d454721bbbb25540c3317521e71c373ae36458f960d2ad46ef088110e95` 

If you wish to use different hashing scheme, please compute the message hash on your side, and then pass
the hex-encoded message hash to the library by using `command.digest` key. Any 32 byte digest will be supported.

### Verifying messages on-chain

If you are going to verify the message in a smart contract and have various types of data that you would like to sign, you
will also need to consider the how you recover the address from the signature on chain, for instance using
[OpenZeppelin's ECDSA library](https://docs.openzeppelin.com/contracts/4.x/api/utils#ECDSA).

For example, if you wish to sign an EIP-191 personal message consisting of an Ethereum `address` and a `bytes32` string, 
you will need to manually hash the individual components using 
[ethers](https://docs.ethers.org/v5/api/utils/hashing/#utils-solidityKeccak256) with `ethers.solidityKeccak256` and then
hash with the `\x19Ethereum Signed Message:` prefix:

```js
export const hashMessageEIP191SolidityKeccak = (
  address: string,
  blockhash: string
) => {
  const messagePrefix = "\x19Ethereum Signed Message:\n32";
  const message = ethers.utils.solidityKeccak256(["address", "bytes32"], [address, blockhash])
  return ethers.utils.solidityKeccak256(
    ["string", "bytes32"],
    [messagePrefix, ethers.utils.arrayify(message)]
  );
};
```

When signing with a HaLo, you will want to use the output from `hashMessageEIP191SolidityKeccak` above as raw input for 
the `command.digest` key as opposed to `command.message` so as not to apply an additional round of unncessary hashing on 
the data. 

## Command: sign_random

Sign a digest composed of a fixed prefix, sequential counter (4 bytes) and a random padding (28 bytes).
The digest will be internally generated by the HaLo Tag, it's not possible to control the value
of the digest that will be signed. The resulting signature will be made using plain ECDSA algorithm.

This command only works with the key slots that are protected with the `RAW_DIGEST_PROHIBITED` flag, and thus
prohibit usage of the raw `sign` command. An example of such slot is the key slot 0x02.

### Arguments

* `keyNo` (int) - optional, number of the protected key slot to use;

If no `keyNo` value is provided, the tag will use key slot 0x02, or a different key slot if the default is overriden
using `cfg_ndef` flags.

### Return value

* `counter` (int) - the current value of key usage counter, incremented with each invocation of this command;
* `payload` (str) - the signed payload generated by the HaLo tag (32 bytes, hex encoded);
* `signature` (str) - DER encoded ECDSA signature of the static prefix and `payload` (hex encoded);
* `publicKey` (str) - public key that generated the signature (65 bytes, uncompressed form, hex encoded);

### Examples
Command:
```json
{
    "name": "sign_random",
    "keyNo": 2
}
```

Response:
```json
{
    "counter": 3,
    "payload": "000000033b4b3dc9df30e83d2508035edb593f5cada8a9095f48fbc2810de06b",
    "signature": "3045022061f084c8f1bb408c347892ab4f740cfb940820eb404b69cc7961004cc0b32241022100a4f848975647e69280e99fcf0dac412c0962b5d2cc751565554c6959689350e4",
    "publicKey": "04aee3af0ab96fe55b394ccaa605f9bc5848252a5297a3f021829f6b45c42bb46a27e7b14444a5e6d61bdb0f557831e1ad2ae5cd48749b498aead069645b6895ca"
}
```

### Errors
* `ERROR_CODE_INVALID_KEY_NO` - invalid key number or the key slot doesn't support this operation;

### Signature details
The signature will be generated according to the following formula:
*If the target key slot is 0x02:*
```
ecdsa.sign(private_key, hashlib.sha256(b'\x19Attest counter pk2:\n' + payload).digest())
```

*If the target key slot is 0x62:*
```
ecdsa.sign(private_key, hashlib.sha256(b'\x19Attest counter pk62:\n' + payload).digest())
```

## Command: sign_challenge

Sign a digest composed of a fixed prefix and user-specified 32 byte challenge value.
The digest will be internally generated by the HaLo Tag, it's not possible to control the value
of the digest that will be signed. The resulting signature will be made using plain ECDSA algorithm.

This command only works with the key slots that are protected with the `RAW_DIGEST_PROHIBITED` flag, and thus
prohibit usage of the raw `sign` command. An example of such slot is the key slot 0x02.

The signature will be generated according to the following formula:
*If the targeted key slot is 0x02:*
```
SHA256(b'\x19External chall pk2:\n' + challenge)
```

*If the targeted key slot is 0x62:*
```
SHA256(b'\x19External chall pk62:\n' + challenge)
```

### Arguments

* `keyNo` (int) - number of the key slot to use;
* `challenge` (str) - hex encoded 32 byte string containing the user's challenge to be signed;

### Return value

* `signature` (str) - DER encoded ECDSA signature of the `digest` (hex encoded);
* `publicKey` (str) - public key that generated the signature (65 bytes, uncompressed form, hex encoded);
* `attestSig` (str) - attest signature of the public key;

### Examples
Command:
```json
{
    "name": "sign_challenge",
    "keyNo": 2,
    "challenge": "bdf40bc6b028a50a1772aa8b6fe4e957d367b5ff21ebd0954682e479aae68976"
}
```

Response:
```json
{
  "signature": "3045022056006c80b2a707ebcee7b8fdb9c84f6f52f1cea75cb682037a058ad85ac3f81a022100e877ded509f19025f0fda0f3eec023db4dab0851f5941056871d7c4eb549f045",
  "publicKey": "04aee3af0ab96fe55b394ccaa605f9bc5848252a5297a3f021829f6b45c42bb46a27e7b14444a5e6d61bdb0f557831e1ad2ae5cd48749b498aead069645b6895ca",
  "attestSig": "02a03046022100a2cee37d8a6b1289de8e55812086fd5835b776955355af77ded88649c176e31f022100b4060ea276e1cf913129c573e7005c6c4d5bf51d293fec64c9dc8e2873a608d7"
}

```

### Errors
* `ERROR_CODE_INVALID_KEY_NO` - invalid key number or the key slot doesn't support this operation;

## Command: write_latch

Write a 32 byte latch slot onto the tag. Once the data is written, it will be impossible to override it.
The latched data will be freely available for reading.

### Arguments

* `command` (str) - must be `write_latch`;
* `latchNo` (int) - number of the latch slot to use;
* `data` (str) - data to be written to the latch slot, must be 32 bytes hex encoded;

### Return value

An object with `status: "ok"` key if the operation was successful.

### Examples
Command:
```json
{
    "name": "write_latch",
    "latchNo": 1,
    "data": "0102030401020304010203040102030401020304010203040102030401020304"
}
```

Response:
```json
{
    "status": "ok"
}
```

### Errors
* `ERROR_CODE_INVALID_LENGTH` - invalid length of the input data, the latch data must be 32 bytes;
* `ERROR_CODE_SLOT_ALREADY_LATCHED` - the latch was already written, it's not possible to override the latch slot;
* `ERROR_CODE_INVALID_LATCH_SLOT` - the targeted slot number doesn't exist;

## Command: cfg_ndef

Reconfigure how the dynamic URL is composed when the user scans the tag.

### Arguments

* `flagUseText` (bool) - whether to use text NDEF record instead of the default URL record, the background
  tag reading on iPhone will not detect the tag anymore (other features will still work correctly);
* `flagHidePk1` (bool) - don't display public key #1 in the URL;
* `flagHidePk2` (bool) - don't display public key #2 in the URL;
* `flagHidePk3` (bool) - don't display public key #3 in the URL (if it was generated);
* `flagShowPk1Attest` (bool) - display attest signature of public key #1 in the URL;
* `flagShowPk2Attest` (bool) - display attest signature of public key #2 in the URL;
* `flagShowPk3Attest` (bool) - display attest signature of public key #3 in the URL (if the key was generated);
* `flagShowLatch1Sig` (bool) - display the signature of latch slot #1 (if it was set);
* `flagShowLatch2Sig` (bool) - display the signature of latch slot #2 (if it was set);
* `flagHideRNDSIG` (bool) - hide `rnd` and `rndsig` fields in the URL;
* `flagHideCMDRES` (bool) - hide `cmd` and `res` fields in the URL (WebNFC command execution will not work);
* `flagLegacyStatic` (bool) - use legacy `static` field with all public keys concatenated together instead of
  the new format where each public key is displayed in a separate query string parameter;
* `flagShowPkN` (bool) - display additional public key corresponding to the key slot number specified by `pkN`;
* `flagShowPkNAttest` (bool) - display attest signature of the key corresponding to the key slot number specified by `pkN`;
* `flagRNDSIGUseBJJ62` (bool) - use key slot 0x62 to generate `rndsig` field (only available on selected tag batches);
* `pkN` (number) - optional, number of the key for `flagShowPkN` and `flagShowPkNAttest` flags;

### Return value

An object with `status: "ok"` key if the operation was successful.

### Examples
Command:
```json
{
  "name": "cfg_ndef",
  "flagUseText": false,
  "flagHidePk1": false,
  "flagHidePk2": false,
  "flagHidePk3": false,
  "flagShowPk1Attest": false,
  "flagShowPk2Attest": false,
  "flagShowPk3Attest": false,
  "flagShowLatch1Sig": false,
  "flagShowLatch2Sig": false,
  "flagHideRNDSIG": false,
  "flagHideCMDRES": false,
  "flagLegacyStatic": false
}
```

Response:
```json
{
    "status": "ok"
}
```

## Command: gen_key

Request the card to generate the key in the specified key slot. This command would only work if the targeted key slot is not yet initialized.
The entropy specified in `command.entropy` will be used to enhance randomness of the generated key pair.

### Arguments

* `keyNo` (number) - number of the targeted key slot (see [HaLo Key Slots](https://github.com/arx-research/libhalo/blob/master/docs/key-slots.md) article for reference);
* `entropy` (str) - additional entropy for key generation (32 bytes, hex encoded);

### Return value

* `needsConfirmPK` (bool) - determines the next step that you need to perform in order to finalize key generation process,
  this value depends on the hardware version of your HaLo;

#### If `needsConfirmPK = true`

This command will also return:
* `publicKey` (str) - generated public key in uncompressed format, 65 bytes in hex;

Then you need to proceed with `gen_key_confirm` command in order to continue the key generation procedure.

#### If `needsConfirmPK = false`

This command will also return:
* `rootPublicKey` (str) - public key of the tag's slot #2
* `rootAttestSig` (str) - manufacturer's signature over the tag's public key #2 

Then you need to proceed with `gen_key_finalize` command in order to finish the key generation procedure.

### Examples
> Web example: [LibHaLo Demos - gen_key.html](https://halo-demos.arx.org/examples/gen_key.html) ([source code](https://github.com/arx-research/libhalo/blob/master/web/examples/gen_key.html))

Command:
```json
{
  "name": "gen_key",
  "keyNo": 3,
  "entropy": "3c825af7d2e1b02b6a00c257ebe883260b4aa6302c9878d412046d10141b261d"
}
```

Response:
```json
{
  "needsConfirmPK": true,
  "publicKey": "047801f0521a56bd3ea172f4308789ea76ab415fd34c636bb820d4619ae15e81cae291f6427e8b4cfa7621ba4ccba10a945441b32585d12daadd8d50339a99d17a"
}
```
or
```json
{
  "needsConfirmPK": false,
  "rootPublicKey": "04aee3af0ab96fe55b394ccaa605f9bc5848252a5297a3f021829f6b45c42bb46a27e7b14444a5e6d61bdb0f557831e1ad2ae5cd48749b498aead069645b6895ca",
  "rootAttestSig": "02a03046022100a2cee37d8a6b1289de8e55812086fd5835b776955355af77ded88649c176e31f022100b4060ea276e1cf913129c573e7005c6c4d5bf51d293fec64c9dc8e2873a608d7"
}
```

### Errors
* `ERROR_CODE_KEY_ALREADY_EXISTS` - the key in slot #3 already exists;

## Command: gen_key_confirm

Perform the 2nd step of the key generation procedure and confirm the generated public key. You only need to perform
this command if `gen_key` had returned `needsConfirmPK = true`.

### Arguments

* `keyNo` (number) - number of the target key slot;
* `publicKey` (str) - public key as returned from `gen_key` command;

### Return value

* `rootPublicKey` (str) - public key of the tag's slot #2
* `rootAttestSig` (str) - manufacturer's signature over the tag's public key #2

### Examples
Command:
```json
{
  "name": "gen_key_confirm",
  "keyNo": 3,
  "publicKey": "047801f0521a56bd3ea172f4308789ea76ab415fd34c636bb820d4619ae15e81cae291f6427e8b4cfa7621ba4ccba10a945441b32585d12daadd8d50339a99d17a"
}
```

Response:
```json
{
  "rootPublicKey": "04aee3af0ab96fe55b394ccaa605f9bc5848252a5297a3f021829f6b45c42bb46a27e7b14444a5e6d61bdb0f557831e1ad2ae5cd48749b498aead069645b6895ca",
  "rootAttestSig": "02a03046022100a2cee37d8a6b1289de8e55812086fd5835b776955355af77ded88649c176e31f022100b4060ea276e1cf913129c573e7005c6c4d5bf51d293fec64c9dc8e2873a608d7"
}
```

### Errors
* `ERROR_CODE_KEY_ALREADY_EXISTS` - the key in slot #3 already exists;
* `ERROR_CODE_CRYPTO_ERROR` - the `command.publicKey` that you have provided doesn't match the public key from the previous step or there was an internal failure with the key generator;

## Command: gen_key_finalize

Finalize the key generation process.

### Arguments

* `keyNo` (number) - number of the target key slot;
* `password` (str) - optional; key slot password to be set, arbitrary UTF-8 text;

### Return value

* `publicKey` (str) - the newly generated public key, uncompressed form, 65 bytes in hex;
* `attestSig` (str) - signature of the newly generated public key made with the tag's key #2;

### Examples
Command:
```json
{
    "name": "gen_key_finalize",
    "keyNo": 3,
    "password": "secret123!"
}
```

Response:
```json
{
  "publicKey": "047801f0521a56bd3ea172f4308789ea76ab415fd34c636bb820d4619ae15e81cae291f6427e8b4cfa7621ba4ccba10a945441b32585d12daadd8d50339a99d17a",
  "attestSig": "3045022100a0f2169d47424783fc829c75926cd7b9dd1aa465f30ca626133fa97fe22af9ed02202b38d52ed2d1ae99abaa1a28e3ec5c726dd5a5dde7fa524b5be6d13e320a7c23"
}
```

### Errors
* `ERROR_CODE_KEY_ALREADY_EXISTS` - the key in slot #3 already exists;
* `ERROR_CODE_CRYPTO_ERROR` - the `command.publicKey` that you have provided doesn't match the public key from the previous step or there was an internal failure with the key generator;

## Command: get_pkeys

Get tag's public keys #1, #2 and #3 (if the third key was generated by the user).

### Arguments

This command doesn't accept any arguments.

### Return value

* `publicKeys[1]` (str) - tag's public key #1, 65 bytes, hex encoded, uncompressed;
* `publicKeys[2]` (str) - tag's public key #2, 65 bytes, hex encoded, uncompressed;
* `publicKeys[3]` (str) - (present if generated by the user) tag's public key #3, 65 bytes, hex encoded, uncompressed;

### Examples
Command:
```json
{
    "name": "get_pkeys"
}
```

Response:
```json
{
    "publicKeys": {
        "1": "043acc264e3c10c01417a871b0f5b31eaacc4e6ee4966cd23420f48be5bc8c90f40c177c49e306d54b33071eeb2502a9bd04b4285530efbcb4dc5c05bfd2bb5d3f",
        "2": "042c2215c8836febbd50a12dd1d1586c79a1b83f6f7bf36340059eba62ee7fe759aa46209a8afaaf2a96f43e47d25cee39eeff3577e704baebeff940deef5092b4"
    },
    "compressedPublicKeys": {
        "1": "033acc264e3c10c01417a871b0f5b31eaacc4e6ee4966cd23420f48be5bc8c90f4",
        "2": "022c2215c8836febbd50a12dd1d1586c79a1b83f6f7bf36340059eba62ee7fe759"
    },
    "etherAddresses": {
        "1": "0x80aB6122F717874B4125d23440548B67eef21936",
        "2": "0x78A0AFF76C8276d3108c20Cbf6249748E528b26c"
    }
}
```

### Errors
This command doesn't throw expected errors.

## Command: get_key_info

Get information about the specific key slot.

### Arguments

* `keyNo` (number) - target key slot;

### Return value

* `keyState` (object) - flags corresponding to the current key state:
  * `isPasswordProtected` (bool) - whether the key is currently password-protected or not;
* `publicKey` (str) - public key of the target key slot (uncompressed, 65 bytes hex);
* `attestSig` (str) - attestation signature of the public key;

### Examples
Command:
```json
{
    "name": "get_key_info",
    "keyNo": 3
}
```

Response:
```json
{
    "keyState": { "isPasswordProtected": true },
    "publicKey": "0440782fc7273bf9613801d5741d37af99d795d6f6c099507b6be370c75bbc44dff8795653b0bab3bae6a256e0f370232f952dbb56f8db46a2fab9b269c0b4f33e",
    "attestSig": "30440220316197a51b8f315f7b331bf276b35fcc65a63139dec5482d55dd0055399904bf0220701159887a3afbf4138a71d122b3d8bd1e904d3d21f53c61d129c91dc145799e"
}
```

### Errors
This command doesn't throw expected errors.

## Command: set_password

Set password protection for the key slot #3. After the password is set, it would not be possible to
sign anything using key slot #3 without providing the correct password. The key in slot #3 must be
already generated on the card.

### Arguments

* `keyNo` (int) - target key slot number, must be set to 3;
* `password` (str) - target password (utf-8 string, must be between 6-32 bytes);

### Return value

* `status` (str) - value `ok` when the password was successfully set; 

### Examples
> Web example: [LibHaLo Demos - pwd_management.html](https://halo-demos.arx.org/examples/pwd_management.html) ([source code](https://github.com/arx-research/libhalo/blob/master/web/examples/pwd_management.html))

Command:
```json
{
    "name": "set_password",
    "keyNo": 3,
    "password": "abc123"
}
```

Response:
```json
{
    "status": "ok"
}
```

### Errors
* `ERROR_CODE_INVALID_LENGTH` - unacceptable password length or general command length error;
* `ERROR_CODE_INVALID_KEY_NO` - the target key number is not #3;
* `ERROR_CODE_KEY_NOT_INITIALIZED` - key slot is not yet initialized;
* `ERROR_CODE_PWD_ALREADY_SET` - password for that key slot is already set;

## Command: unset_password

Remove password protection from the key slot #3

### Arguments

* `keyNo` (int) - target key slot number, must be set to 3;
* `password` (str) - target password (utf-8 string, must be between 6-32 bytes);
* `publicKeyHex` (str) - the public key of the target slot (hex encoded, uncompressed);

### Return value

* `status` (str) - value `ok` when the password was successfully set;

### Examples
Command:
```json
{
    "name": "unset_password",
    "keyNo": 3,
    "password": "abc123",
    "publicKeyHex": "049d1e9cd828fcea59cfee261c705ed84023103537aea7069fe001129cdf69e60bc0c6de184cc0e6a5b396c19a4450e94dafa9dc87b6a527e60aa2104bb253933e"
}
```

Response:
```json
{
  "status": "ok"
}
```

### Errors
* `ERROR_CODE_INVALID_LENGTH` - unacceptable password length or general command length error;
* `ERROR_CODE_INVALID_KEY_NO` - the target key number is not #3;
* `ERROR_CODE_PWD_NOT_SET` - password for that key slot is not set or the slot is not yet initialized;
* `ERROR_CODE_WRONG_PWD` - wrong password (or target public key) provided by the user;

## Command: get_data_struct

Batch retrieve certain public objects from the HaLo tag (like public key values, latch values etc.)

### Arguments

* `spec` (str) - list of queried objects;

#### Format for `spec`

The `spec` value is expected to be formatted as:
```
<object type>:<object id>,<object type>:<object id>,...
```

Where the acceptable object types are:
* `publicKey` - the uncompressed public key corresponding to the particular key slot;
* `publicKeyAttest` - the public key's attest signature;
* `keySlotFlags` - status flags corresponding to the particular key slot (returned as an object);
* `keySlotFailedAuthCtr` - failed password authentication counter of the particular key slot (returned as a number);
* `latchValue` - value of the latch (possible object IDs: 1, 2);
* `latchAttest` - attest signature of the latch;
* `graffiti` - value of the rewritable data slot (possible object IDs: 1);
* `firmwareVersion` - HaLo firmware version (object ID: 1 - core version; object ID: 2 - addons version);

### Return value

* `isPartial` (bool) - whether the query was answered in full or there was not enough space in the output buffer to return all requested objects;
* `data` (object) - values of the queried objects;

### Examples
Command:
```json
{
    "name": "get_data_struct",
    "spec": "publicKey:1,publicKey:2,publicKey:200"
}
```

Response:
```json
{
    "isPartial": false,
    "data": {
        "publicKey:1": "04d034dd75fecae0879246bd3fafdd3195d3aad1c89d59aa39cb191714451af74732ccf1abbe5b86a55c52b29bf3c862b0234e021126a8371196083dacaed44c2b",
        "publicKey:2": "049fbc8dbeee3af7ca838ff9276670aac077cb3309347cd1dca0f383c445b2b529548092490293801871de74807ec833a44526cc4c43edbe2a53354fef630f66a5",
        "publicKey:200": null
    }
}
```

### Errors

This command doesn't throw expected errors.

## Command: get_graffiti

Gets data stored in the rewritable static string slot.

### Arguments

* `slotNo` (int) - number of the data slot to be fetched (currently supported: 1)

### Return value

* `data` (str) - the fetched ASCII string

## Command: store_graffiti

Stores the new data in the rewritable static string slot. This data will also be displayed in the dynamic URL.

### Arguments

* `slotNo` (int) - number of the data slot to be fetched (currently supported: 1)
* `data` (string) - ASCII string containing from 0 to 32 characters, supported charset: `A-Z`, `a-z`, `0-9`, `-_.`

### Return value

* `status` (string) - value `ok`

## Command: version

**(Only for PC/SC and React Native driver)** Get tag's firmware version.

**Note:** This command is only supported with PC/SC and React Native drivers.

### Arguments

This command doesn't accept any arguments.

### Return value

* `version` (str) - full version string;
* `parts.verMajor` (int) - major version number;
* `parts.verMinor` (str) - minor version identifier;
* `parts.verSeq` (int) - minor version sequential number;
* `parts.verShortId` (str) - unique identifier;

**Note:** Comparing versions: All versions are sortable on `(verMajor, verSeq)` pair.
The version with higher `verMajor` is always more recent than the version with lower `verMajor` value.
If two versions have the same `verMajor` value, the version with the higher `verSeq` is always more recent.

### Examples
Command:
```json
{
    "name": "version"
}
```

Response:
```json
{
    "version": "01.C5.000083.633916E1",
    "parts": { "verMajor": 1, "verMinor": "C5", "verSeq": 83, "verShortId": "633916E1" }
}
```

### Errors
This command doesn't throw expected errors.

## Command: read_ndef

**(Only for PC/SC and React Native driver)** Read the dynamic URL generated by the tag.

### Arguments

This command doesn't accept any arguments.

### Return value

* `url` (str) - the hostname part of the URL;
* `qs` (object) - query string parameters of the URL, the contents depends on the tag's version and configuration;

### Examples
Command:
```json
{
  "name": "read_ndef"
}
```

Response:
```json
{
  "url": "https://eth.vrfy.ch/",
  "qs": {
    "cmd": "0103",
    "flags": "03",
    "pk1": "042C061312771F471910EF8A3A437AC89F6FF81B2AEB0E3F5DCC2DD15D0D9D1FD7B48DBA2EC753F0F70EA9B9A85DF8A16E664546C9F7BAD2BE38E08EEC63B916C7",
    "pk2": "049FAEE2F29091BD63C48E8DD13E2577475C7EB4D4C6FA741300DEDF5847E08F578296507382DA42145D0CE5E5D6534BC94BA2BA8EDBD6BB52AF21223F914CEAB0",
    "pk3": "048069784D0C60E64952AA68744BB7DFFF0BFFA4CFF0D160208A7A86600B466A433787F64B6EFB0B8700E392D8ECB8ED5F1EE08F2440022D4EFB8AB5AB3C2A9846",
    "res": "304502201222FE729AD86F3D0C4A879100412CF180A18419EA4B4643CA48A31812B36054022100E04B27DD708E228E75E9AC1AB33A62041B64321362B317C091ACA837ECF425CE00",
    "rnd": "0000002F398C23DA2760BF005AB51293A29E538FC5DE9DDC9C494860C672717D",
    "rndsig": "3046022100CB2A3C54BF3981C3E0FD7F1980DB0E049F82197BD0706725D27F50252CC64F3F02210098095442DD6C2DBC5C98B8F2A769ED8158FED11DBC6E587C9B3CA5EFE37ED81C",
    "v": "01.C5.000083.633916E1"
  }
}
```

### Errors
This command doesn't throw expected errors.

## Command: pcsc_detect

**(Only available with CLI tool)** Detect connected PC/SC readers and inserted tags.

### Arguments

This command doesn't accept any arguments.

### Return value

* `status` (str) - `ok` if the HaLo tag was detected;

### Errors

The command will fail with an error if no HaLo tag was found.
