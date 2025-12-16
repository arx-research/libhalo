/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

import {checkErrors, execHaloCmd} from "./common.js";
import {HaloLogicError} from "../halo/exceptions.js";
import {readNDEF} from "./read_ndef.js";
import {Buffer} from 'buffer/index.js';
import {EmptyOptions, HaloCommandObject, RNNFCManager} from "../types.js";
import {ISO7816_SELECT_CMDS} from "../aid.js";

async function selectCore(nfcManager: RNNFCManager) {
    for (const selectCmdHex of ISO7816_SELECT_CMDS) {
        const selectCmdBuf = [...Buffer.from(selectCmdHex, "hex")];
        const resSelect = Buffer.from(await nfcManager.isoDepHandler.transceive(selectCmdBuf));

        if (resSelect.compare(Buffer.from([0x90, 0x00])) === 0) {
            return true;
        }
    }

    throw new HaloLogicError("Unable to initiate communication with the tag. Failed to select HaLo core.");
}

async function execCoreCommandRN(nfcManager: RNNFCManager, command: Buffer) {
    await selectCore(nfcManager);

    const cmdBuf = Buffer.concat([
        Buffer.from("B0510000", "hex"),
        Buffer.from([command.length]),
        command,
        Buffer.from("00", "hex")
    ]);

    const res = Buffer.from(await nfcManager.isoDepHandler.transceive([...cmdBuf]));
    checkErrors(res.slice(0, -2));

    return {
        result: res.slice(0, -2).toString('hex'),
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
