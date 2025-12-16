/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

import {readNDEF} from "./read_ndef.js";
import {HaloLogicError, NFCOperationError} from "../halo/exceptions.js";
import {execHaloCmd, checkErrors, wrapCommandForU2F, unwrapResultFromU2F} from "./common.js";
import {
    ExecHaloCmdOptions, ExecOptions,
    HaloCommandObject,
    Reader
} from "../types.js";
import {Buffer} from 'buffer/index.js';
import {ISO7816_SELECT_CMDS} from "../aid.js";

async function selectCore(reader: Reader) {
    let res;

    for (const aid of ISO7816_SELECT_CMDS) {
        try {
            res = await reader.transmit(Buffer.from(aid, "hex"), 255);
        } catch (e) {
            throw new NFCOperationError((<Error> e).message);
        }

        if (res.slice(-2).compare(Buffer.from([0x90, 0x00])) === 0) {
            return;
        }
    }

    throw new HaloLogicError("Unable to select HaLo core.");
}

async function selectU2FLayer(reader: Reader) {
    try {
        const res = await reader.transmit(Buffer.from("00A4040008A0000006472F0001", "hex"), 255);
        const statusCheck = res.slice(-2).compare(Buffer.from([0x90, 0x00])) === 0;

        if (!statusCheck) {
            throw new HaloLogicError("Unable to select HaLo U2F layer.");
        }
    } catch (e) {
        throw new HaloLogicError("Unable to access HaLo U2F layer. " +
            "This command must be run with administrative privileges.");
    }
}

async function transceive(reader: Reader, command: Buffer, options: ExecOptions) {
    options = options || {};

    const start = performance.now();
    let res;

    try {
        res = await reader.transmit(command, 255);
    } catch (e) {
        throw new NFCOperationError((<Error> e).message);
    }

    const end = performance.now();

    if (process.env.DEBUG_PCSC === "1") {
        console.log('=> ' + command.toString('hex'));
        console.log('<= [' + Math.round(end - start) + ' ms] ' + res.toString('hex'));
    }

    const check1 = res.slice(-2).compare(Buffer.from([0x90, 0x00])) !== 0;
    const check2 = res.slice(-2).compare(Buffer.from([0x91, 0x00])) !== 0;

    if (!options.noCheck) {
        if (check1 && check2) {
            throw new HaloLogicError("Command failed, cmd: " + command.toString('hex') + ", response: " + res.toString('hex'));
        }

        return res.slice(0, -2);
    } else {
        return res;
    }
}

async function getVersion(reader: Reader): Promise<string> {
    const versionRes = await transceive(reader, Buffer.from("00510000010700", "hex"), {noCheck: true});

    if (versionRes.slice(-2).compare(Buffer.from([0x90, 0x00])) !== 0) {
        // GET_FV_VERSION command not supported, fallback to NDEF
        const wrappedTransceive = async (payload: Buffer) => await transceive(reader, payload, {noCheck: true});
        const url = await readNDEF(wrappedTransceive);

        if (!url.qs.v) {
            return '01.C1.000001.00000000';
        } else if ((url.qs.v as string).toLowerCase() === 'c2') {
            return '01.C2.000002.00000000';
        } else if ((url.qs.v as string).toLowerCase() === 'c3') {
            return '01.C3.000003.00000000';
        } else {
            return (url.qs.v as string);
        }
    } else {
        return versionRes.slice(0, -2).toString();
    }
}

async function getAddonVersion(reader: Reader) {
    const addonVersionRes = await transceive(reader, Buffer.from("00510000011000", "hex"), {noCheck: true});

    if (addonVersionRes.slice(-2).compare(Buffer.from([0x90, 0x00])) !== 0) {
        return null;
    }

    return addonVersionRes.slice(0, -2).toString();
}

async function execCoreCommand(reader: Reader, command: Buffer, options?: ExecOptions) {
    options = Object.assign({}, options);

    let cmdBuf;

    if (options.pcscExecLayer === "u2f") {
        await selectU2FLayer(reader);
        cmdBuf = wrapCommandForU2F(command);
    } else {
        cmdBuf = Buffer.concat([
            Buffer.from("B0510000", "hex"),
            Buffer.from([command.length]),
            command,
            Buffer.from("00", "hex")
        ]);
    }

    let res = await transceive(reader, cmdBuf, options);

    if (options.pcscExecLayer === "u2f") {
        res = unwrapResultFromU2F(res);
    }

    checkErrors(res);

    if (options.pcscExecLayer === "u2f") {
        await selectCore(reader);
    }

    return {
        result: res.toString('hex'),
        extra: {}
    };
}

function makeOptions(reader: Reader): ExecHaloCmdOptions {
    return {
        method: 'pcsc',
        exec: async (command, options) => await execCoreCommand(reader, command, options),
    }
}

async function execHaloCmdPCSC(command: HaloCommandObject, reader: Reader) {
    await selectCore(reader);

    const options = makeOptions(reader);
    command = {...command};

    if (command.name === "version") {
        const version = await getVersion(reader);
        const addonVersion = await getAddonVersion(reader);

        return {
            "core": {
                "ver": version
            },
            "addons": {
                "ver": addonVersion
            }
        };
    } else if (command.name === "read_ndef") {
        // PCSC-specific NDEF reader command
        const wrappedTransceive = async (payload: Buffer) => await transceive(reader, payload, {noCheck: true});
        return await readNDEF(wrappedTransceive);
    } else if (command.name === "full_gen_key") {
        await selectCore(reader);

        let rootPkRes = await execHaloCmd({
            "name": "gen_key",
            "keyNo": command.keyNo,
            "entropy": command.entropy
        }, options);

        if (rootPkRes.needsConfirmPK) {
            rootPkRes = await execHaloCmd({
                "name": "gen_key_confirm",
                "keyNo": command.keyNo,
                "publicKey": rootPkRes.publicKey
            }, options);
        }

        const subPkRes = await execHaloCmd({
            "name": "gen_key_finalize",
            "keyNo": command.keyNo,
            "password": command.password
        }, options);

        return {
            generatedPublicKey: {...subPkRes, attestedWith: rootPkRes}
        };
    } else {
        // divert to the common command execution flow
        await selectCore(reader);
        return await execHaloCmd(command, options);
    }
}

export {execHaloCmdPCSC};
