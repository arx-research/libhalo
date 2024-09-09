/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

import {Buffer} from 'buffer/index.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import {NFC} from 'nfc-pcsc';
import open from 'open';

import {__runTestSuite} from "@arx-research/libhalo/__tests";
import util from "util";
import {
    wsEventCardDisconnected,
    wsCreateServer,
    wsEventCardConnected,
    wsEventReaderConnected,
    wsEventCardIncompatible,
    wsEventReaderDisconnected
} from "./ws_server.js";
import {execHaloCmdPCSC} from "@arx-research/libhalo/api/desktop";
import {ConnectSimulatorOptions, HaloCommandObject, Reader} from "@arx-research/libhalo/types";
import {Namespace} from "argparse";
import {INFC, SimNFC} from "./simulator_nfc.js";
import fs from "fs";
import {getSimConfig, getSimConfigPath} from "./util.js";

let simOptions: ConnectSimulatorOptions | null = null;
let nfc: INFC;

if (fs.existsSync(getSimConfigPath())) {
    const simConfig = getSimConfig();

    if (simConfig.enabled) {
        simOptions = simConfig as ConnectSimulatorOptions;
    }
}

if (!simOptions) {
    nfc = new NFC();
} else {
    nfc = new SimNFC(simOptions);
}

let stopPCSCTimeout: number | null = null;
let isConnected = false;
let isClosing = false;

async function checkCard(reader: Reader) {
    // try to select Halo ETH Core Layer
    try {
        const resSelect = await reader.transmit(Buffer.from("00A4040007481199130E9F0100", "hex"), 255);
        return resSelect.compare(Buffer.from([0x90, 0x00])) === 0;
    } catch (e) {
        console.error(e);
        return false;
    }
}

function ensureSimulator() {
    if (!(nfc instanceof SimNFC)) {
        console.error('Simulator is not enabled!');
        process.exit(1);
    }

    return nfc;
}

function runHalo(entryMode: string, args: Namespace) {
    nfc.on('reader', (reader: Reader) => {
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
            if (args.output === "color") {
                if (nfc instanceof SimNFC) {
                    console.warn('[!] Running on simulator (sim_instance=' + nfc.getSimInstance() + '; cset_id=' + nfc.getCardSetID() + ')');
                }
            }

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

            clearTimeout(stopPCSCTimeout!);
            stopPCSCTimeout = setTimeout(stopPCSC, 4000, "timeout", args.output);

            (async () => {
                const res = await checkCard(reader);

                if (res) {
                    clearTimeout(stopPCSCTimeout);
                    isConnected = true;
                    let res = null;

                    if (args.name === "pcsc_detect") {
                        console.log("HaLo tag detected:", reader.reader.name);
                        res = {"status": "ok"};
                    } else if (args.name === "sim_console") {
                        console.log(ensureSimulator().getConsoleURL());
                        process.exit(0);
                    } else if (args.name === "sim_set_card") {
                        await ensureSimulator().swapCard(args.id);
                        console.log('Card swapped on simulator.');
                        process.exit(0);
                    } else if (args.name === "sim_destroy") {
                        await ensureSimulator().destroyCardSet();
                        console.log('Card set was destroyed.');
                        process.exit(0);
                    } else if (args.name === "sim_reset") {
                        await ensureSimulator().resetCardSet(args.options);
                        console.log('Card set was reset.');
                        process.exit(0);
                    } else if (args.name === "test") {
                        res = await __runTestSuite({"__this_is_unsafe": true},
                            "pcsc", async (command: HaloCommandObject) => await execHaloCmdPCSC(command, reader));
                    } else {
                        try {
                            res = await execHaloCmdPCSC(args, reader);
                        } catch (e) {
                            if (args.output === "color") {
                                console.error(e);
                            } else {
                                console.log(JSON.stringify({"_exception": {"message": String(e), "stack": (<Error> e).stack}}));
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

    nfc.on('error', (err: Error) => {
        if (!isClosing) {
            console.log('an error occurred', err);
        }
    });

    function stopPCSC(code: string, output: string) {
        clearTimeout(stopPCSCTimeout!);

        if (code === "error" && output === "color") {
            console.error('Command execution failed.');
        } else if (code !== "done") {
            if (output === "color") {
                console.error("HaLo tag or compatible PC/SC reader not found.");
            } else {
                console.log(JSON.stringify({"_error": "HaLo tag or compatible PC/SC reader not found."}));
            }
        }

        for (const rdrName in nfc.readers) {
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
