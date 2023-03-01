const {execCredential} = require("./credential");
const {execWebNFC} = require("./webnfc");
const {
    NFCAbortedError,
    NFCMethodNotSupported,
    HaloLogicError
} = require("../halo/exceptions");
const {cmdSign, cmdCfgNDEF, cmdWriteLatch, cmdSignRandom} = require("../halo/commands");

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
        case 'sign':
            return await cmdSign(options, command);
        case 'sign_random':
            return await cmdSignRandom(options, command);
        case 'write_latch':
            return await cmdWriteLatch(options, command);
        case 'cfg_ndef':
            return await cmdCfgNDEF(options, command);
        default:
            throw new HaloLogicError("Unsupported command.name parameter specified.");
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
    options.method = options.method || detectMethod();
    options.noDebounce = options.noDebounce || false;
    options.compatibleCallMode = options.compatibleCallMode || true;

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

module.exports = {execHaloCmdWeb, execHaloCmd};
