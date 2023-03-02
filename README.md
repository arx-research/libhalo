# LibHaLo

Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.

## Installation

```
npm install --save @arx-research/libhalo
```

## Available APIs

The library exposes the following API functions:

### (Web browser) execHaloCmdWeb
```
async function execHaloCmdWeb(command, options)
```

For web browser applications: scan the HaLo tag presented to the smartphone, execute the
HaLo command and return the result. Supporting Chrome (Android), Safari (iOS) and other browsers.
Installation of additional software is not required on the user's side.

**Guides:**
* [Using libhalo as a standalone library in a classic HTML web application](/docs/web-standalone.md)
* [Using libhalo within a React.js web application](/docs/web-reactjs.md)
* [Documentation of the execHaloCmdWeb API](/docs/api-web.md)

### (React Native) initNFCManagerHalo, execHaloCmd
```
async function initNFCManagerHalo(nfcManager)
```

```
async function execHaloCmd(command, options)
```

For React Native mobile applications (Android/iOS) based on `react-native-nfc-manager` library: scan the HaLo tag presented to the smartphone, execute the HaLo command and return the result.

**Guides:**
* [Using libhalo within a React Native mobile application for Android/iOS](/docs/mobile-react-native.md)
* [Documentation of the initNFCManagerHalo, execHaloCmd API](/docs/api-react-native.md)

### (Desktop) execHaloCmdPCSC
```
async function execHaloCmdPCSC(command, reader)
```

For desktop applications based on `nfc-pcsc` library: scan the HaLo tag present at the specified `reader`, execute the HaLo command and return the result.

**Guides:**
* [Using libhalo as a CLI tool on the desktop computer with PC/SC reader (USB NFC reader)](/docs/desktop-cli.md)
* [Using libhalo to build your own application for desktop computers with PC/SC reader (USB NFC reader)](/docs/desktop-pcsc.md)
* [Documentation of the execHaloCmdPCSC API](/docs/api-pcsc.md)

## Supported HaLo commands

This library supports the following HaLo tag commands:

* `sign` - sign arbitrary data using ECDSA private key on the NFC tag;
* `sign_random` - sign a sequential counter with random pad using ECDSA private key on the NFC tag;
* `write_latch` - write one-time programmable memory slot on the NFC tag;
* `cfg_ndef` - configure the parameters returned in the dynamic URL when the NFC tag is scanned;
* `gen_key` - request generation of the key #3 on the NFC tag;
* `gen_key_confirm` - confirm the generated public key of key slot #3;

Full article: [Documentation of the available commands (HaLo Command Set)](/docs/halo-command-set.md)
