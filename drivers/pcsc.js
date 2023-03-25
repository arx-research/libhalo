/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

const {readNDEF} = require("./read_ndef");
const {HaloLogicError} = require("../halo/exceptions");
const {execHaloCmd, checkErrors} = require("./common");

async function selectCore(reader) {
    let res = await reader.transmit(Buffer.from("00A4040007481199130E9F0100", "hex"), 255);
    let statusCheck = res.slice(-2).compare(Buffer.from([0x91, 0x00])) !== 0;

    if (!statusCheck) {
        throw new HaloLogicError("Unable to select HaLo core.");
    }
}

async function transceive(reader, command, options) {
    options = options || {};

    let start = performance.now();
    let res = await reader.transmit(command, 255);
    let end = performance.now();

    if (process.env.DEBUG_PCSC === "1") {
        console.log('=> ' + command.toString('hex'));
        console.log('<= [' + Math.round(end - start) + ' ms] ' + res.toString('hex'));
    }

    let check1 = res.slice(-2).compare(Buffer.from([0x90, 0x00])) !== 0;
    let check2 = res.slice(-2).compare(Buffer.from([0x91, 0x00])) !== 0;

    if (!options.noCheck) {
        if (check1 && check2) {
            throw new HaloLogicError("Command failed, cmd: " + command.toString('hex') + ", response: " + res.toString('hex'));
        }

        return res.slice(0, -2);
    } else {
        return res;
    }
}

async function getVersion(reader) {
    let versionRes = await transceive(reader, Buffer.from("00510000010700", "hex"), {noCheck: true});

    if (versionRes.slice(-2).compare(Buffer.from([0x90, 0x00])) !== 0) {
        // GET_FV_VERSION command not supported, fallback to NDEF
        let wrappedTransceive = async (payload) => await transceive(reader, payload, {noCheck: true});
        let url = await readNDEF(wrappedTransceive, {allowCache: true});

        if (!url.qs.v) {
            return '01.C1.000001.00000000';
        } else if (url.qs.v.toLowerCase() === 'c2') {
            return '01.C2.000002.00000000';
        } else if (url.qs.v.toLowerCase() === 'c3') {
            return '01.C3.000003.00000000';
        } else {
            return url.qs.v;
        }
    } else {
        return versionRes.slice(0, -2).toString();
    }
}

async function getAddonVersion(reader) {
    let addonVersionRes = await transceive(reader, Buffer.from("00510000011000", "hex"), {noCheck: true});

    if (addonVersionRes.slice(-2).compare(Buffer.from([0x90, 0x00])) !== 0) {
        return null;
    }

    return addonVersionRes.slice(0, -2).toString();
}

async function execCoreCommand(reader, command) {
    const cmdBuf = Buffer.concat([
        Buffer.from("B0510000", "hex"),
        Buffer.from([command.length]),
        command,
        Buffer.from("00", "hex")
    ]);

    let res = await transceive(reader, cmdBuf);
    checkErrors(res);

    return {
        result: res.toString('hex'),
        extra: {}
    };
}

function makeOptions(reader) {
    return {
        method: 'pcsc',
        exec: async (command) => await execCoreCommand(reader, command),
    }
}

async function execHaloCmdPCSC(command, reader) {
    let version = await getVersion(reader);

    let [verMajor, verMinor, verSeq, verShortId] = version.split('.');
    verSeq = parseInt(verSeq, 10);

    if (verMajor > 1) {
        throw new HaloLogicError("This version of CLI doesn't support major release version " + verMajor + ". Please update.");
    }

    let options = makeOptions(reader);
    command = {...command};

    if (command.name === "version") {
        // PCSC-specific version retrieval command
        let addonVersion = await getAddonVersion(reader);
        let addonParts = null;

        if (addonVersion) {
            let [verAMajor, verAMinor, verASeq, verAShortId] = addonVersion.split('.');
            verASeq = parseInt(verASeq, 10);
            addonParts = {
                verAMajor,
                verAMinor,
                verASeq,
                verAShortId
            };
        }

        return {
            "core": {
                "ver": version,
                "parts": {
                    verMajor,
                    verMinor,
                    verSeq,
                    verShortId
                }
            },
            "addons": {
                "ver": addonVersion,
                "parts": addonParts
            }
        };
    } else if (command.name === "read_ndef") {
        // PCSC-specific NDEF reader command
        let wrappedTransceive = async (payload) => await transceive(reader, payload, {noCheck: true});
        return await readNDEF(wrappedTransceive, {allowCache: true});
    } else {
        // divert to the common command execution flow
        await selectCore(reader);
        return await execHaloCmd(command, options);
    }
}

module.exports = {execHaloCmdPCSC};
