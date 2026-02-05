/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

import {Buffer} from 'buffer/index.js';
import {TransceiveFunc} from "../types.js";
import {HaloLogicError} from "../halo/exceptions.js";

async function unlockHW(transceive: TransceiveFunc, keyNo: number) {
    let resUnlockHw;

    do {
        resUnlockHw = await transceive(Buffer.concat([
            Buffer.from("8052000001", "hex"),
            Buffer.from([keyNo]),
            Buffer.from([0x00]),
        ]));
        process.stdout.write(".");
    } while (resUnlockHw.compare(Buffer.from([0x91, 0xAF])) === 0);

    process.stdout.write("\n");

    if (resUnlockHw.compare(Buffer.from([0x90, 0x00])) !== 0) {
        throw new HaloLogicError("Failed to perform HW unlocking of the key slot.");
    }

    return {
        "status": "ok"
    };
}

export {unlockHW};
