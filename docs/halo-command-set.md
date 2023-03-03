# HaLo Command Set

## Table of contents

* [Feature compatibility](#feature-compatibility)
* [Command: sign](#command-sign)
* [Command: sign_random](#command-sign_random)
* [Command: write_latch](#command-write_latch)
* [Command: cfg_ndef](#command-cfg_ndef)
* [Command: gen_key](#command-gen_key)
* [Command: gen_key_confirm](#command-gen_key_confirm)
* [Command: get_pkeys](#command-get_pkeys)

## Feature compatibility

Certain HaLo features might not be supported with the earlier versions of tags.

Please check [HaLo Tag Firmware Versions](/docs/firmware-versions.md) for the detailed compatibility table.

## Command: sign

Sign an arbitrary message using ECDSA/Keccak algorithm or sign a raw digest using plain ECDSA.

### Arguments
* `message` (str) - the hex-encoded message to be signed using Ethereum's hashing algorithm;
* `digest` (str) - the raw hex-encoded 32 byte digest to be signed using plain ECDSA;
* `keyNo` (int) - number of the key slot to use;
* `legacySignCommand` (bool) - whether to use legacy command for signing, see the note below;

**Note:** You can specify either `message` or `digest`, not both.

**Note:** Set `legacySignCommand` to `true` if your tags are generating URLs
without `v` (version) query string parameter or the `v` parameter is lower than `01.C4` (by lexicographical comparison).
Don't use if all your tags have `v=01.C4` or higher.

### Return value
* `input.keyNo` - number of the requested key slot;
* `input.digest` - the digest that was uploaded to the HaLo tag for signing (32 bytes, hex encoded);
* `input.message` - (optional) the message that was used to compute the Keccak digest (hex encoded);
* `signature.raw` - raw signature in the (r, s, v) format, where `v` is a recovery param (values: 27 or 28);
* `signature.der` - DER encoded signature (hex encoded);
* `signature.ether` - Ethereum-formatted signature;
* `publicKey` - the public key corresponding to the requested key slot (65 bytes, hex encoded, uncompressed);

### Examples
#### Message signing
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
  "publicKey": "046ca7458b4c8c4f9a196094bda5f01ac1e588f6604bc2f7a58ba4d1fa3c3cb9102720bdb43f73972ea3dfc1c6ab8a6cb7d14114765eb76ff0fb2df34a5f7cab56"
}
```

#### Raw digest signing
Command:
```json
{
    "name": "sign_raw",
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
    "publicKey": "046ca7458b4c8c4f9a196094bda5f01ac1e588f6604bc2f7a58ba4d1fa3c3cb9102720bdb43f73972ea3dfc1c6ab8a6cb7d14114765eb76ff0fb2df34a5f7cab56"
}
```

### Errors
* `ERROR_CODE_INVALID_KEY_NO` - invalid key number provided or the key slot doesn't support this operation;
* `ERROR_CODE_KEY_NOT_INITIALIZED` - targeted key is not initialized yet;
* `ERROR_CODE_INVALID_LENGTH` - trying to sign a digest which is not 32 bytes long;

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
the hex-encoded message hash to the library by using `command.digest` key. Any 32 byte digest will be supported,
so you could use Keccak-256 (without prefix), SHA-256 or other hashing algorithms.

## Command: sign_random

Sign a digest composed of a sequential counter (4 bytes) and a random padding (28 bytes) using key #2.
The digest will be internally generated by the HaLo Tag, it's not possible to control the value
of the digest that will be signed.

### Arguments

* `keyNo` (int) - number of the key slot to use;

### Return value

* `counter` (int) - the current value of key usage counter, incremented with each invocation;
* `digest` (str) - the digest generated by the HaLo tag (32 bytes, hex encoded);
* `signature` (str) - DER encoded ECDSA signature of the `digest` (hex encoded);

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
    "counter": 51,
    "digest": "00000033e2188fd9dc939b2afd62932d747683a9d820b238ca5b914ae6553346",
    "signature": "3046022100ab8a4b4dc84abcc9c32742da81d95fdfc34d8fad8b1441000883ec3b75834eff022100ca18ce4fcd62165206141707dd28235d5f4f5b6bd3efb03e8b849c0736beba67"
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

Request the card to generate the key in #3 slot, which is uninitialized by default. You can optionally provide extra entropy for the key generation process using `command.entropy` key.

**Note:** If you provide additional entropy, this command will return the derived public key. You will need to confirm the public key using `gen_key_confirm` command.
This step is not necessary if you don't provide additional entropy.

### Arguments

* `entropy` (str) - optional, additional entropy (32 bytes, hex encoded);

### Return value

* `status` (str) - `ok` when the key is generated successfully;
* `publicKey` (str) - the public key that was generated;
* `needsConfirm` (bool) - whether you need to call `gen_key_confrm` after running this command;

### Examples
Command:
```json
{
  "name": "gen_key",
  "entropy": "3c825af7d2e1b02b6a00c257ebe883260b4aa6302c9878d412046d10141b261d"
}
```

Response:
```json
{
  "status": "ok",
  "publicKey": "04f670a3d30e2b98b2e3691908722e643791be4a58eaf63e02026df7d67ae456cdece3e27671a96a104c50f6184cdc548b13a9fa3cc7a5c96956339256681a426d",
  "needsConfirm": true
}
```

### Errors
* `ERROR_CODE_KEY_ALREADY_EXISTS` - the key in slot #3 already exists;

## Command: gen_key_confirm

Confirm the generated public key in slot #3. This call is only necessary if you have called `gen_key` with additional entropy.

### Arguments

* `publicKey` (str) - the public key returned from `gen_key` command;

### Return value

* `status` (str) - `ok` when the key generation is confirmed successfully;

### Examples
Command:
```json
{
    "name": "gen_key_confirm",
    "publicKey": "04f670a3d30e2b98b2e3691908722e643791be4a58eaf63e02026df7d67ae456cdece3e27671a96a104c50f6184cdc548b13a9fa3cc7a5c96956339256681a426d"
}
```

Response:
```json
{
    "status": "ok"
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
    "1": "042c061312771f471910ef8a3a437ac89f6ff81b2aeb0e3f5dcc2dd15d0d9d1fd7b48dba2ec753f0f70ea9b9a85df8a16e664546c9f7bad2be38e08eec63b916c7",
    "2": "049faee2f29091bd63c48e8dd13e2577475c7eb4d4c6fa741300dedf5847e08f578296507382da42145d0ce5e5d6534bc94ba2ba8edbd6bb52af21223f914ceab0",
    "3": "048069784d0c60e64952aa68744bb7dfff0bffa4cff0d160208a7a86600b466a433787f64b6efb0b8700e392d8ecb8ed5f1ee08f2440022d4efb8ab5ab3c2a9846"
  }
}
```

### Errors
This command doesn't throw errors.
