/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

import {checkErrors, execHaloCmd} from "./common.ts";
import {HaloLogicError} from "../halo/exceptions.ts";
import {readNDEF} from "./read_ndef.ts";
import {Buffer} from 'buffer/index.js';
import {EmptyOptions, HaloCommandObject, RNNFCManager} from "../types.js";

async function execCoreCommandRN(nfcManager: RNNFCManager, command: Buffer) {
    const selectCmd = [...Buffer.from("00A4040007481199130E9F0100", "hex")];
    const resSelect = Buffer.from(await nfcManager.isoDepHandler.transceive(selectCmd));

    if (resSelect.compare(Buffer.from([0x90, 0x00])) !== 0) {
        throw new HaloLogicError("Unable to initiate communication with the tag. Failed to select HaLo core.");
    }

    const cmdBuf = Buffer.concat([
        Buffer.from("B0510000", "hex"),
        Buffer.from([command.length]),
        command,
        Buffer.from("00", "hex")
    ]);

    const res = Buffer.from(await nfcManager.isoDepHandler.transceive([...cmdBuf]));
    checkErrors(res);

    return {
        result: res.toString('hex'),
        extra: {}
    };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function execHaloCmdRN(nfcManager: RNNFCManager, command: HaloCommandObject, options?: EmptyOptions) {
    if (command.name === "read_ndef") {
        const wrappedTransceive = async (payload: Buffer) => Buffer.from(await nfcManager.isoDepHandler.transceive([...payload]));
        return await readNDEF(wrappedTransceive);
    } else {
        return await execHaloCmd(command, {
            method: 'nfc-manager',
            exec: async (command: Buffer) => await execCoreCommandRN(nfcManager, command),
        });
    }
}

export {execHaloCmdRN};
