const {NFCAbortedError, NFCMethodNotSupported} = require("../halo/exceptions");
const {execCredential} = require("./credential");
const {execWebNFC} = require("./webnfc");
const {execHaloCmd} = require("./common");
const {defaultWebNFCStatusCallback} = require("../web/soft_prompt");

let isCallRunning = null;

function makeDefault(curValue, defaultValue) {
    if (typeof curValue === "undefined") {
        return defaultValue;
    }

    if (curValue === null) {
        return defaultValue;
    }

    return curValue;
}

/**
 * Detect the best command execution method for the current device.
 * @returns {string} Either "credential" or "webnfc".
 */
function detectMethod() {
    try {
        new NDEFReader();
    } catch (e) {
        // WebNFC not supported
        return "credential";
    }

    return "webnfc";
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
                    statusCallback: options.statusCallback,
                    compatibleCallMode: options.compatibleCallMode
                })
            };
        } else if (options.method === "webnfc") {
            options.statusCallback = makeDefault(options.statusCallback, defaultWebNFCStatusCallback);

            cmdOpts = {
                method: "webnfc",
                exec: async (command) => await execWebNFC(command, {
                    statusCallback: options.statusCallback
                })
            };
        } else {
            throw new NFCMethodNotSupported("Unsupported options.method parameter specified.");
        }

        return await execHaloCmd(command, cmdOpts);
    } finally {
        if (options.statusCallback) {
            options.statusCallback("finished", {
                execMethod: options.method,
                execStep: "finished",
                cancelScan: () => null,
            });
        }

        isCallRunning = false;
    }
}

module.exports = {
    execHaloCmdWeb,
    detectMethod
};
