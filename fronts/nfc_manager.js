const {ERROR_CODES} = require("../halo/errors");
const {HaloLogicError, HaloTagError} = require("../halo/exceptions");
const Buffer = require('buffer/').Buffer;

async function execCoreCommandRN(nfcManager, command) {
    const cmdBuf = Buffer.concat([
        Buffer.from("B0510000", "hex"),
        Buffer.from([command.length]),
        command,
        Buffer.from("00", "hex")
    ]);

    let res = Buffer.from(await nfcManager.isoDepHandler.transceive([...cmdBuf]));

    if (res.length === 2 && res[0] === 0xE1) {
        if (ERROR_CODES.hasOwnProperty(res[1])) {
            let err = ERROR_CODES[res[1]];
            throw new HaloTagError(err[0], "Tag responded with error: [" + err[0] + "] " + err[1]);
        } else {
            throw new HaloLogicError("Tag responded with unknown error: " + res.toString('hex'));
        }
    }

    return {
        result: res.toString('hex'),
        extra: {}
    };
}

async function initNFCManagerHalo(nfcManager) {
    // select core layer
    let selectCmd = [...Buffer.from("00A4040007481199130E9F0100", "hex")];
    let res = Buffer.from(await nfcManager.isoDepHandler.transceive(selectCmd));

    if (res.compare(Buffer.from([0x90, 0x00])) !== 0) {
        throw Error("Failed to initiate communication with Halo NFC tag.");
    }

    return {
        method: 'nfc-manager',
        exec: async (command) => await execCoreCommandRN(nfcManager, command),
    }
}

module.exports = {initNFCManagerHalo};
