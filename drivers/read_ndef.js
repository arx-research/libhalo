/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

import {Buffer} from 'buffer/index.js';
import queryString from 'query-string';
import {HaloLogicError} from "../halo/exceptions.js";

async function readNDEF(transceive) {
    let resSelect = await transceive(Buffer.from("00A4040007D276000085010100", "hex"));

    if (resSelect.compare(Buffer.from([0x90, 0x00])) !== 0) {
        throw new HaloLogicError("Unable to read NDEF, failed to select NDEF application.");
    }

    // assume that NDEF file is 0xE104
    let resSelectFile = await transceive(Buffer.from("00A4000C02E10400", "hex"));

    if (resSelectFile.compare(Buffer.from([0x90, 0x00])) !== 0) {
        throw new HaloLogicError("Unable to read NDEF, failed to select NDEF file.");
    }

    let readCmdBuf = Buffer.from("00B0000002", "hex");
    let resReadLength = await transceive(readCmdBuf);

    if (resReadLength.slice(-2).compare(Buffer.from([0x90, 0x00])) !== 0) {
        throw new HaloLogicError("Unable to read NDEF, failed to read length bytes.");
    }

    let ndefLen = resReadLength.readUInt16BE(0) + 2;
    let tmpNdefLen = ndefLen;
    let offset = 0;

    let fullBuf = Buffer.alloc(0);

    while (tmpNdefLen > 0) {
        readCmdBuf.writeUInt16BE(offset, 2);
        // ACR122U-A9 readers have a bug where they are returning 6F00 when Le is set to more than 0x3B
        // sounds like a firmware bug, because it can't be reproduced with other kinds of readers
        // (the same APDU is just working fine lol)
        readCmdBuf[4] = 0x30;

        let resReadNDEF = await transceive(readCmdBuf);

        if (resReadNDEF.slice(-2).compare(Buffer.from([0x90, 0x00])) !== 0) {
            throw new HaloLogicError("Unable to read NDEF, failed to read NDEF file.");
        }

        fullBuf = Buffer.concat([fullBuf, resReadNDEF.slice(0, -2)]);
        tmpNdefLen -= 0x30;
        offset += 0x30;
    }

    fullBuf = fullBuf.slice(2, ndefLen);

    // here we only implement a very small subset of NDEF to match with what is generated
    // by HaLo tags

    // URL record type
    // (byte) 0xC1, (byte) 0x01, (byte) 0x00, (byte) 0x00 <len 2 bytes> 55 00
    // TEXT record type (language = "en")
    // (byte) 0xC1, (byte) 0x01, (byte) 0x00, (byte) 0x00 <len 2 bytes> 54 02 65 6E
    if (fullBuf.slice(0, 4).compare(Buffer.from("C1010000", "hex")) !== 0) {
        throw new HaloLogicError("Failed to parse NDEF, unsupported NDEF header.");
    }

    fullBuf = fullBuf.slice(4);
    let lengthData = fullBuf.readUInt16BE(0);

    if (fullBuf[2] !== 0x54 && fullBuf[2] !== 0x55) {
        throw new HaloLogicError("Failed to parse NDEF, unsupported record type.");
    }

    let skipLen = fullBuf[3];
    fullBuf = fullBuf.slice(4 + skipLen, 4 + skipLen + lengthData);
    let parsed = queryString.parseUrl(fullBuf.toString());

    return {
        url: parsed.url,
        qs: {...parsed.query}
    };
}

export {readNDEF};
