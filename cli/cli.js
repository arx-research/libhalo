/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

import {Buffer} from 'buffer/index.js';
import {NFC} from 'nfc-pcsc';
import open from 'open';

import {__runTestSuite} from "../halo/tests.js";
import util from "util";
import {
    wsEventCardDisconnected,
    wsCreateServer,
    wsEventCardConnected,
    wsEventReaderConnected,
    wsEventCardIncompatible,
    wsEventReaderDisconnected
} from "./ws_server.js";
import {execHaloCmdPCSC} from "../api/desktop.js";

const nfc = new NFC();
let stopPCSCTimeout = null;
let isConnected = false;
let isClosing = false;

async function checkCard(reader) {
    // try to select Halo ETH Core Layer
    try {
        let resSelect = await reader.transmit(Buffer.from("00A4040007481199130E9F0100", "hex"), 255);
        return resSelect.compare(Buffer.from([0x90, 0x00])) === 0;
    } catch (e) {
        console.error(e);
        return false;
    }
}

function runHalo(entryMode, args) {
    nfc.on('reader', reader => {
        reader.autoProcessing = false;

        reader.on('error', err => {
            console.log(`${reader.reader.name} an error occurred`, err);
        });

        if (args.reader && args.reader !== reader.reader.name) {
            return;
        }

        if (args.name === "pcsc_detect") {
            console.log('Detected PC/SC reader:', reader.reader.name);
        } else if (entryMode === "server") {
            wsEventReaderConnected(reader);
        }

        reader.on('card', card => {
            if (entryMode === "server") {
                (async () => {
                    if (await checkCard(reader)) {
                        wsEventCardConnected(reader);
                    } else {
                        wsEventCardIncompatible(reader);
                    }
                })();
                return;
            }

            if (args.name === "pcsc_detect") {
                console.log("Tag inserted:", reader.reader.name, '(Type: ' + card.type + ', ATR: ' + card.atr.toString('hex').toUpperCase() + ')');
            }

            clearTimeout(stopPCSCTimeout);
            stopPCSCTimeout = setTimeout(stopPCSC, 4000, "timeout", args.output);

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

        reader.on('card.off', card => {
            if (entryMode === "server") {
                wsEventCardDisconnected(reader);
            }
        });

        reader.on('end', () => {
            if (entryMode === "server") {
                wsEventCardDisconnected(reader);
                wsEventReaderDisconnected(reader);
            }
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
                console.error("HaLo tag or compatible PC/SC reader not found.");
            } else {
                console.log(JSON.stringify({"_error": "HaLo tag or compatible PC/SC reader not found."}));
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

    if (entryMode === "server") {
        console.log('Launching HaLo Bridge Server...');
        wsCreateServer(args, () => Object.keys(nfc.readers).map(r => nfc.readers[r].name));
        console.log('HaLo Bridge Server is listening...');

        if (!args.nonInteractive) {
            open('http://127.0.0.1:' + args.listenPort);
        }
    } else {
        stopPCSCTimeout = setTimeout(stopPCSC, 4000, "timeout", args.output);
    }
}

export {runHalo};
