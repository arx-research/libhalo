/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

import {
    HaloLogicError,
    HaloTagError
} from "../halo/exceptions.js";
import {
    cmdGetPkeys,
    cmdSign,
    cmdCfgNDEF,
    cmdWriteLatch,
    cmdSignRandom,
    cmdGenKey,
    cmdGenKeyConfirm,
    cmdGenKeyFinalize,
    cmdSignChallenge,
    cmdSetURLSubdomain,
    cmdSetPassword,
    cmdUnsetPassword,
    cmdReplacePassword,
    cmdGetKeyInfo,
    cmdGetTransportPK,
    cmdLoadTransportPK,
    cmdExportKey,
    cmdImportKey,
    cmdImportKeyInit,
    cmdGetDataStruct,
    cmdGetGraffiti,
    cmdStoreGraffiti,
    cmdCfgNDEFStoreGraffiti,
    cmdReplacePasswordStoreGraffiti,
    cmdUnlockOnline, cmdGetDataStructV2
} from "../halo/commands.js";
import {ERROR_CODES} from "../halo/errors.js";
import {
    ExecHaloCmdOptions,
    HaloCommandObject,
    HaloResponseObject
} from "../types.js";
import {Buffer} from 'buffer';
import {arr2hex, webDebug} from "../halo/util.js";

async function execHaloCmd(command: HaloCommandObject, options: ExecHaloCmdOptions): Promise<HaloResponseObject> {
    command = Object.assign({}, command);

    const commandName = command.name;
    delete command['name'];

    switch (commandName) {
        case 'get_pkeys':
            return await cmdGetPkeys(options, command);
        case 'sign':
            return await cmdSign(options, command);
        case 'sign_random':
            return await cmdSignRandom(options, command);
        case 'sign_challenge':
            return await cmdSignChallenge(options, command);
        case 'write_latch':
            return await cmdWriteLatch(options, command);
        case 'cfg_ndef':
            return await cmdCfgNDEF(options, command);
        case 'gen_key':
            return await cmdGenKey(options, command);
        case 'gen_key_confirm':
            return await cmdGenKeyConfirm(options, command);
        case 'gen_key_finalize':
            return await cmdGenKeyFinalize(options, command);
        case 'set_url_subdomain':
            return await cmdSetURLSubdomain(options, command);
        case 'set_password':
            return await cmdSetPassword(options, command);
        case 'replace_password':
            return await cmdReplacePassword(options, command);
        case 'unset_password':
            return await cmdUnsetPassword(options, command);
        case 'get_key_info':
            return await cmdGetKeyInfo(options, command);
        case 'get_transport_pk':
            return await cmdGetTransportPK(options, command);
        case 'load_transport_pk':
            return await cmdLoadTransportPK(options, command);
        case 'export_key':
            return await cmdExportKey(options, command);
        case 'import_key_init':
            return await cmdImportKeyInit(options, command);
        case 'import_key':
            return await cmdImportKey(options, command);
        case 'get_data_struct':
            return await cmdGetDataStruct(options, command);
        case 'get_data_struct_v2':
            return await cmdGetDataStructV2(options, command);
        case 'get_graffiti':
            return await cmdGetGraffiti(options, command);
        case 'store_graffiti':
            return await cmdStoreGraffiti(options, command);
        case 'replace_password_store_graffiti':
            return await cmdReplacePasswordStoreGraffiti(options, command);
        case 'cfg_ndef_store_graffiti':
            return await cmdCfgNDEFStoreGraffiti(options, command);
        case 'unlock_online':
            return await cmdUnlockOnline(options, command);
        default:
            throw new HaloLogicError("Unsupported command.name parameter specified.");
    }
}

function buildHaloTagError(code: number, payload?: Buffer | null): HaloTagError {
    if (Object.prototype.hasOwnProperty.call(ERROR_CODES, code)) {
        const err = ERROR_CODES[code];
        return new HaloTagError({
            name: err[0],
            message: err[1],
            payload,
        });
    } else {
        const errCode = arr2hex([code]);
        return new HaloTagError({
            name: "ERROR_CODE_" + errCode,
            message: "Command returned an unknown error: " + arr2hex([code]),
            payload,
        });
    }
};

function getHaloTagError(res: Buffer): HaloTagError | null {
    // generic HaLo error
    if (res.length === 2 && res[0] === 0xE1) {
        webDebug('[libhalo] command fail:', arr2hex(res));
        return buildHaloTagError(res[1]);
    }

    // ERROR_CODE_AUTH_SOFT_LOCKED
    if (res.length === 2+16 && res[0] == 0xE1 && res[1] == 0x21) {
        webDebug('[libhalo] command fail:', arr2hex(res));
        return buildHaloTagError(res[1], res.slice(2));
    }

    return null;
}

function checkHaloTagError(res: Buffer) {
    const err = getHaloTagError(res);

    if (err) {
        throw err;
    }
}

function wrapCommandForU2F(command: Buffer) {
    const payload = Buffer.concat([
        Buffer.from(Array(64)),
        Buffer.from([command.length]),
        command
    ]);

    return Buffer.concat([
        Buffer.from("00020800", "hex"),
        Buffer.from([payload.length]),
        payload,
        Buffer.from([0x00])
    ]);
}

function unwrapResultFromU2F(res: Buffer) {
    return res.slice(5);
}

export {
    execHaloCmd,
    getHaloTagError,
    checkHaloTagError,
    wrapCommandForU2F,
    unwrapResultFromU2F
};
