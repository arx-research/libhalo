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
* [Command: version (only for PCSC/React Native)](#command-version)
* [Command: read_ndef (only for PCSC/React Native)](#command-read_ndef)
* [Command: pcsc_detect (only with CLI tool)](#command-pcsc_detect)

## Feature compatibility

Certain HaLo features might not be supported with the earlier versions of tags.

Please check [HaLo Tag Firmware Versions](/docs/firmware-versions.md) for the detailed compatibility table.

## Command: sign

Sign an arbitrary message using ERC-191 (version 0x45) algorithm, typed data (EIP-712), or sign a raw digest using plain ECDSA (secp256k1) algorithm. This command could use tag's private key slot #1 or #3.

### Arguments
* `message` (str) - the hex-encoded message to be signed as an Ethereum EIP-191 personal message;
* `digest` (str) - the raw hex-encoded 32 byte digest to be signed using plain ECDSA;
* `typedData` (object) - EIP-712 typed data to be signed, should contain sub-keys: `domain`, `types`, `value`;
* `keyNo` (int) - number of the key slot to use;
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

### Examples
#### Message signing (ERC-191)
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

#### Typed data signing (EIP-712)
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
  "publicKey": "042c061312771f471910ef8a3a437ac89f6ff81b2aeb0e3f5dcc2dd15d0d9d1fd7b48dba2ec753f0f70ea9b9a85df8a16e664546c9f7bad2be38e08eec63b916c7"
}
```

#### Raw digest signing
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

Sign a digest composed of a sequential counter (4 bytes) and a random padding (28 bytes) with tag's private key slot #2.
The digest will be internally generated by the HaLo Tag, it's not possible to control the value
of the digest that will be signed. The resulting signature will be made using plain ECDSA algorithm (secp256k1).

### Arguments

* `keyNo` (int) - number of the key slot to use;

### Return value

* `counter` (int) - the current value of key usage counter, incremented with each invocation of this command;
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
This command doesn't throw expected errors.

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
