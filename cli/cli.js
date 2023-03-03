const Buffer = require('buffer/').Buffer;
const { NFC } = require('nfc-pcsc');

const {parseArgs} = require('./args.js');
const {execHaloCmdPCSC} = require('../index.js');
const {__runTestSuite} = require("../halo/tests");
const util = require("util");

const nfc = new NFC();
let stopPCSCTimeout = null;
let isConnected = false;
let isClosing = false;

let args = parseArgs();

if (!args) {
    process.exit(0);
}

async function checkCard(reader) {
    // try to select Halo ETH Core Layer
    let resSelect = await reader.transmit(Buffer.from("00A4040007481199130E9F0100", "hex"), 255);
    return resSelect.compare(Buffer.from([0x90, 0x00])) === 0;
}

nfc.on('reader', reader => {

    if (args.name === "pcsc_detect") {
        console.log('Detected PC/SC reader:', reader.reader.name);
    }

    reader.autoProcessing = false;

    reader.on('card', card => {
        clearTimeout(stopPCSCTimeout);
        stopPCSCTimeout = setTimeout(stopPCSC, 4000, "timeout", args.output);

        if (args.name === "pcsc_detect") {
            console.log("Tag inserted:", reader.reader.name, '(Type: ' + card.type + ', ATR: ' + card.atr.toString('hex').toUpperCase() + ')');
        }

        (async () => {
            let res = await checkCard(reader);

            if (res) {
                clearTimeout(stopPCSCTimeout);
                isConnected = true;
                let res = null;

                if (args.name === "pcsc_detect") {
                    console.log("HaLo tag detected:", reader.reader.name);
                    res = {"status": "ok"};
                } else if (args.name === "test") {
                    res = await __runTestSuite({"__this_is_unsafe": true},
                        "pcsc", async (command) => await execHaloCmdPCSC(command, reader));
                } else {
                    try {
                        res = await execHaloCmdPCSC(args, reader);
                    } catch (e) {
                        if (args.output === "color") {
                            console.error(e);
                        } else {
                            console.log(JSON.stringify({"_exception": {"message": String(e), "stack": e.stack}}));
                        }
                    }
                }

                if (res !== null) {
                    if (args.output === "color") {
                        console.log(util.inspect(res, {depth: Infinity, colors: true}));
                    } else {
                        console.log(JSON.stringify(res));
                    }

                    stopPCSC("done", args.output);
                } else {
                    stopPCSC("error", args.output);
                }
            } else {
                console.log("Not a HaLo tag:", reader.reader.name);
            }
        })();
    });

    reader.on('error', err => {
        console.log(`${reader.reader.name} an error occurred`, err);
    });

});

nfc.on('error', err => {
    if (!isClosing) {
        console.log('an error occurred', err);
    }
});

function stopPCSC(code, output) {
    clearTimeout(stopPCSCTimeout);

    if (code === "error" && output === "color") {
        console.error('Command execution failed.');
    } else if (code !== "done") {
        if (output === "color") {
            console.error("NFC card or compatible PC/SC reader not found.");
        } else {
            console.log(JSON.stringify({"_error": "NFC card or compatible PC/SC reader not found."}));
        }
    }

    for (let rdrName in nfc.readers) {
        nfc.readers[rdrName].close();
    }

    isClosing = true;
    nfc.close();

    if (code !== "done") {
        process.exit(1);
    }
}

stopPCSCTimeout = setTimeout(stopPCSC, 4000, "timeout", args.output);
