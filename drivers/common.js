/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

const {execCredential} = require("./credential");
const {execWebNFC} = require("./webnfc");
const {
    NFCAbortedError,
    NFCMethodNotSupported,
    HaloLogicError,
    HaloTagError
} = require("../halo/exceptions");
const {
    cmdGetPkeys, cmdSign, cmdCfgNDEF, cmdWriteLatch, cmdSignRandom, cmdGenKey, cmdGenKeyConfirm, cmdGenKeyFinalize,
    cmdSignChallenge
} = require("../halo/commands");
const {ERROR_CODES} = require("../halo/errors");

let isCallRunning = null;

function detectMethod() {
    try {
        new NDEFReader();
    } catch (e) {
        // WebNFC not supported
        return "credential";
    }

    return "webnfc";
}

async function execHaloCmd(command, options) {
    command = Object.assign({}, command);

    let commandName = command.name;
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
        default:
            throw new HaloLogicError("Unsupported command.name parameter specified.");
    }
}

function makeDefault(curValue, defaultValue) {
    if (typeof curValue === "undefined") {
        return defaultValue;
    }

    if (curValue === null) {
        return defaultValue;
    }

    return curValue;
}

function checkErrors(res) {
    if (res.length === 2 && res[0] === 0xE1) {
        if (ERROR_CODES.hasOwnProperty(res[1])) {
            let err = ERROR_CODES[res[1]];
            throw new HaloTagError(err[0], "Tag responded with error: [" + err[0] + "] " + err[1]);
        } else {
            throw new HaloLogicError("Tag responded with unknown error: " + res.toString('hex'));
        }
    }
}

/**
 * Execute the NFC command from the web browser.
 * @param command Command specification object.
 * @param options Additional options for the command executor.
 * @returns {Promise<*>} Command execution result.
 */
async function execHaloCmdWeb(command, options) {
    if (options && !options.noDebounce && isCallRunning) {
        throw new NFCAbortedError("The operation was debounced.");
    }

    isCallRunning = true;

    options = options ? Object.assign({}, options) : {};
    options.method = makeDefault(options.method, detectMethod());
    options.noDebounce = makeDefault(options.noDebounce, false);
    options.compatibleCallMode = makeDefault(options.compatibleCallMode, true);

    command = command ? Object.assign({}, command) : {};

    try {
        let cmdOpts = {};

        if (options.method === "credential") {
            cmdOpts = {
                method: "credential",
                exec: async (command) => await execCredential(command, {
                    debugCallback: options.debugCallback,
                    statusCallback: options.statusCallback,
                    compatibleCallMode: options.compatibleCallMode
                })
            };
        } else if (options.method === "webnfc") {
            cmdOpts = {
                method: "webnfc",
                exec: async (command) => await execWebNFC(command, {
                    debugCallback: options.debugCallback,
                    statusCallback: options.statusCallback
                })
            };
        } else {
            throw new NFCMethodNotSupported("Unsupported options.method parameter specified.");
        }

        return await execHaloCmd(command, cmdOpts);
    } finally {
        isCallRunning = false;
    }
}

module.exports = {
    execHaloCmdWeb,
    execHaloCmd,
    checkErrors
};
