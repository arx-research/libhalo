/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

const WebSocketAsPromised = require('websocket-as-promised');
const QRCode = require('qrcode');
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
const {JWEUtil} = require("../halo/jwe_util");
const crypto = require('crypto').webcrypto;

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

function makeQR(url) {
    return new Promise((resolve, reject) => {
        QRCode.toDataURL(url, function (err, url) {
            if (err) {
                reject(err);
            } else {
                resolve(url);
            }
        });
    });
}

class HaloGateway {
    constructor(gatewayServer, gatewayServerHttp) {
        this.jweUtil = new JWEUtil();
        this.isRunning = false;

        this.gatewayServer = gatewayServer;
        this.gatewayServerHttp = gatewayServerHttp;
        this.lastCommand = null;

        this.ws = new WebSocketAsPromised(this.gatewayServer + '/?side=requestor', {
            packMessage: data => JSON.stringify(data),
            unpackMessage: data => JSON.parse(data),
            attachRequestId: (data, requestId) => Object.assign({uid: requestId}, data),
            extractRequestId: data => data && data.uid
        });

        this.ws.onSend.addListener(data => {
            let obj = JSON.parse(data);

            if (obj.type === "request_cmd") {
                this.lastCommand = obj;
            }
        });

        this.ws.onUnpackedMessage.addListener(data => {
            if (data.type === "executor_connected" && this.lastCommand) {
                // existing executor connection was replaced, repeat last command
                this.ws.sendPacked(this.lastCommand);
            }
        });
    }

    async startPairing() {
        await this.ws.open();

        // TODO this doesn't throw when websocket is closed while waiting

        let sharedKey = await this.jweUtil.generateKey();
        let randomQs = Buffer.from(crypto.getRandomValues(new Uint8Array(4))).toString('hex');

        let welcomeMsg = await this.ws.waitUnpackedMessage(ev => ev && ev.type === "welcome");
        let execURL = this.gatewayServerHttp + '?_=' + randomQs + '/#/' + welcomeMsg.sessionId + '/' + sharedKey + '/';
        let qrCode = await makeQR(execURL);

        return {
            execURL: execURL,
            qrCode: qrCode
        };
    }

    async waitConnected() {
        // TODO this doesn't throw when websocket is closed while waiting
        await this.ws.waitUnpackedMessage(ev => ev && ev.type === "executor_connected");
    }

    async execHaloCmd(command) {
        if (this.isRunning) {
            throw new Error("Can not make multiple calls to execHaloCmd() in parallel.");
        }

        try {
            let res = await this.ws.sendRequest({
                "type": "request_cmd",
                "payload": await this.jweUtil.encrypt(command)
            });

            if (res.type !== "result_cmd") {
                throw new Error("Unexpected packet type.");
            }

            return await this.jweUtil.decrypt(res.payload);
        } finally {
            this.isRunning = false;
        }
    }
}

module.exports = {
    execHaloCmdWeb,
    execHaloCmd,
    checkErrors,
    HaloGateway
};
