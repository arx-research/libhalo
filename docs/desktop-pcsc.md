# Using LibHaLo to build your own application for desktop computers with PC/SC reader (USB NFC reader)

## Install dependencies
```bash
npm i --save nfc-pcsc
npm i --save @arx-research/libhalo
```

## Basic usage
Import the libraries:

```javascript
import {NFC} from 'nfc-pcsc';
import {execHaloCmdPCSC} from '@arx-research/libhalo/api/desktop';
```

Implement basic code:

```javascript
const nfc = new NFC();

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

nfc.on('reader', reader => {
    reader.autoProcessing = false;

    reader.on('card', card => {
        (async () => {
            // the card was detected, we can execute some HaLo commands
            // please note you can call execHaloCmdPCSC() multiple times
            // in order to execute multiple operations in a single tap

            for (let command of commands) {
                try {
                    let res = await execHaloCmdPCSC(command, reader);
                    // display the result
                    console.log(res);
                } catch (e) {
                    // display the error
                    console.error(e);
                }
            }
        })();
    });

    reader.on('error', err => {
        console.log(`${reader.reader.name} an error occurred`, err);
    });
});

nfc.on('error', err => {
    console.log('An error occurred', err);
});

console.log('Tap the tag...');
```

## Notes

Please review the [documentation on the execHaloCmdPCSC function](/docs/api-pcsc.md) to find out
the exact specification of the `execHaloCmdPCSC()` function.

Please review the [documentation of the available commands (Halo Command Set)](/docs/halo-command-set.md) to find
out what commands are available with the HaLo tags.

## Example project

Please check GitHub [arx-research/libhalo-example-pcsc](https://github.com/arx-research/libhalo-example-pcsc) project for the complete project example.
