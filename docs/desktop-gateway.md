# Using LibHaLo to build your own application for desktop computers using HaLo Gateway (using remote smartphone as the NFC reader)

## Install dependencies
```bash
npm i --save qrcode
npm i --save websocket
npm i --save @arx-research/libhalo
```

## Basic usage
Import the libraries:

```javascript
import process from 'node:process';

import {HaloGateway} from "@arx-research/libhalo/api/desktop.js";
import QRCode from 'qrcode';
import websocket from 'websocket';
```

Implement basic code:

```javascript
// list of HaLo commands that will be executed
// once the tag is detected by the reader
let commands = [
    {
        "name": "sign",
        "message": "010203",
        "keyNo": 1
    },
    {
        "name": "sign",
        "message": "05050505",
        "keyNo": 1
    }
];

let gate = new HaloGateway('wss://s1.halo-gateway.arx.org', {
    createWebSocket: (url) => new websocket.w3cwebsocket(url)
});

let pairInfo = await gate.startPairing();

QRCode.toString(pairInfo.execURL, {type: 'terminal'}, function (err, qrtext) {
    console.log('Please scan the following QR code using your smartphone:');
    console.log('');
    console.log(qrtext);
    console.log('');
})

console.log('Waiting for smartphone to connect...');
await gate.waitConnected();

for (let cmd of commands) {
    console.log('Executing command:', cmd);
    let res = await gate.execHaloCmd(cmd);
    console.log('Command result:', res);
}

process.exit(0);
```

## Notes

Please review the [documentation of the available commands (Halo Command Set)](/docs/halo-command-set.md) to find
out what commands are available with the HaLo tags.

## Example project

Please check GitHub [arx-research/libhalo-example-pc-gateway](https://github.com/arx-research/libhalo-example-pc-gateway) project for the complete project example.
