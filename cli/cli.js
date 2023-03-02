const Buffer = require('buffer/').Buffer;
const { NFC } = require('nfc-pcsc');

const {parseArgs} = require('./args.js');
const {execHaloCmdPCSC} = require('../index.js');
const {runTestSuite} = require("../tests");

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

    reader.autoProcessing = false;

    reader.on('card', card => {
        clearTimeout(stopPCSCTimeout);
        stopPCSCTimeout = setTimeout(stopPCSC, 4000, "timeout");

        (async () => {
            let res = await checkCard(reader);

            if (res) {
                clearTimeout(stopPCSCTimeout);
                isConnected = true;
                let res;

                if (args.name === "test") {
                    res = await runTestSuite("pcsc", async (command) => await execHaloCmdPCSC(command, reader));
                } else {
                    res = await execHaloCmdPCSC(args, reader);
                }

                if (res !== null) {
                    console.log(res);
                    stopPCSC("done");
                } else {
                    stopPCSC("error");
                }
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

function stopPCSC(code) {
    clearTimeout(stopPCSCTimeout);

    if (code === "error") {
        console.error('Command execution failed.');
    } else if (code !== "done") {
        console.error('NFC card or compatible PC/SC reader not found.');
    }

    for (let rdrName in nfc.readers) {
        nfc.readers[rdrName].close();
    }

    isClosing = true;
    nfc.close();

    if (code === "error") {
        process.exit(1);
    }
}

stopPCSCTimeout = setTimeout(stopPCSC, 4000, "timeout");
