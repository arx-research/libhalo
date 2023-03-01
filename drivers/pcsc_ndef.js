const Buffer = require('buffer/').Buffer;
const queryString = require('query-string');

let cachedResult = null;

async function readNDEF(reader, options) {
    options = options || {};

    if (options.allowCache && cachedResult) {
        return cachedResult;
    }

    const start = performance.now();
    let resSelect = await reader.transmit(Buffer.from("00A4040007D276000085010100", "hex"), 255);

    if (resSelect.compare(Buffer.from([0x90, 0x00])) !== 0) {
        throw Error("Unable to select app");
    }

    let resSelectFile = await reader.transmit(Buffer.from("00A4000C02E10400", "hex"), 255);

    if (resSelectFile.compare(Buffer.from([0x90, 0x00])) !== 0) {
        throw Error("Unable to select NDEF file");
    }

    let readCmdBuf = Buffer.from("00B0000002", "hex");
    let resReadLength = await reader.transmit(readCmdBuf, 255);

    if (resReadLength.slice(-2).compare(Buffer.from([0x90, 0x00])) !== 0) {
        throw Error("Unable to read NDEF length");
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

        let resReadNDEF = await reader.transmit(readCmdBuf, 255);

        if (resReadNDEF.slice(-2).compare(Buffer.from([0x90, 0x00])) !== 0) {
            throw Error("Unable to read NDEF file");
        }

        fullBuf = Buffer.concat([fullBuf, resReadNDEF.slice(0, -2)]);
        tmpNdefLen -= 0x30;
        offset += 0x30;
    }

    const end = performance.now();
    // console.log('Took: ' + Math.round(end - start) + ' ms');
    let fullBufStr = fullBuf.slice(0, ndefLen).toString();
    let qs;

    if (fullBufStr.includes("?v=")) {
        qs = 'v=' + fullBuf.toString().split('?v=', 2)[1];
    } else if (fullBufStr.includes("?static=")) {
        qs = 'static=' + fullBuf.toString().split('?static=', 2)[1];
    }

    let out = queryString.parse(qs);

    if (options.allowCache) {
        cachedResult = out;
    }

    return out;
}

module.exports = {readNDEF};
