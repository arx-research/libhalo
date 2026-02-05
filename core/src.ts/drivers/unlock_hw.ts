/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

import {Buffer} from 'buffer/index.js';
import {TransceiveFunc} from "../types.js";
import {HaloLogicError} from "../halo/exceptions.js";

interface UnlockHWCallback {
    (cur: number, max: number): void
}

async function unlockHW(transceive: TransceiveFunc, keyNo: number, statusCallback?: UnlockHWCallback | null) {
    let resUnlockHw;

    while (true) {
        resUnlockHw = await transceive(Buffer.concat([
            Buffer.from("8052000001", "hex"),
            Buffer.from([keyNo]),
            Buffer.from([0x00]),
        ]));

        const status = resUnlockHw.slice(-2);

        if (status.compare(Buffer.from([0x90, 0x00])) === 0) {
            return {
                "status": "ok",
                "details": "UNLOCK_OK"
            };
        } else if (status.compare(Buffer.from([0x69, 0x85])) === 0) {
            return {
                "status": "ok",
                "details": "ALREADY_UNLOCKED"
            };
        } else if (status.compare(Buffer.from([0x91, 0xAF])) === 0) {
            const cur = resUnlockHw.readUInt16BE(0);
            const max = resUnlockHw.readUInt16BE(2);

            if (statusCallback) {
                statusCallback(cur, max);
            }
        } else if (status.compare(Buffer.from([0x69, 0x83])) === 0) {
            throw new HaloLogicError("Failed to perform key slot unlocking, the key slot may be permanently locked.");
        } else {
            throw new HaloLogicError("Unknown error when trying to unlock: " + status.toString("hex").toUpperCase());
        }
    }
}

export {UnlockHWCallback, unlockHW};
