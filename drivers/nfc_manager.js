/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

import {checkErrors, execHaloCmd} from "./common.js";
import {HaloLogicError} from "../halo/exceptions.js";
import {readNDEF} from "./read_ndef.js";
import {Buffer} from 'buffer/index.js';

async function execCoreCommandRN(nfcManager, command) {
    let selectCmd = [...Buffer.from("00A4040007481199130E9F0100", "hex")];
    let resSelect = Buffer.from(await nfcManager.isoDepHandler.transceive(selectCmd));

    if (resSelect.compare(Buffer.from([0x90, 0x00])) !== 0) {
        throw new HaloLogicError("Unable to initiate communication with the tag. Failed to select HaLo core.");
    }

    const cmdBuf = Buffer.concat([
        Buffer.from("B0510000", "hex"),
        Buffer.from([command.length]),
        command,
        Buffer.from("00", "hex")
    ]);

    let res = Buffer.from(await nfcManager.isoDepHandler.transceive([...cmdBuf]));
    checkErrors(res);

    return {
        result: res.toString('hex'),
        extra: {}
    };
}

async function execHaloCmdRN(nfcManager, command, options) {
    options = options ? Object.assign({}, options) : {};

    if (command.name === "read_ndef") {
        let wrappedTransceive = async (payload) => Buffer.from(await nfcManager.isoDepHandler.transceive([...payload]));
        return await readNDEF(wrappedTransceive);
    } else {
        return await execHaloCmd(command, {
            method: 'nfc-manager',
            exec: async (command) => await execCoreCommandRN(nfcManager, command),
        });
    }
}

export {execHaloCmdRN};
