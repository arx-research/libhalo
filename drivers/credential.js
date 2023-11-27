/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

const {HaloTagError, HaloLogicError, NFCOperationError, NFCMethodNotSupported} = require("../halo/exceptions");
const {ERROR_CODES} = require("../halo/errors");
const {arr2hex} = require("../halo/util");

const FLAG_USE_NEW_MODE = 0x00;

async function execCredential(request, options) {
    if (!window.isSecureContext) {
        throw new NFCMethodNotSupported("This method can be invoked only in the secure context (HTTPS).");
    }

    options = Object.assign({}, options) || {};

    if (!options.statusCallback) {
        options.statusCallback = () => null;
    }

    let challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    let encodedRequest = new Uint8Array([...request]);
    let ctrl = new AbortController();
    let u2fReq = {
        "publicKey": {
            "allowCredentials": [
                {
                    "id": encodedRequest,
                    "transports": ['nfc'],
                    "type": "public-key"
                }
            ],
            "challenge": challenge,
            "timeout": 60000,
            "userVerification": "discouraged"
        },
        "signal": ctrl.signal
    };

    let u2fRes;

    options.statusCallback("init", {
        execMethod: "credential",
        execStep: "get-credential",
        cancelScan: () => ctrl.abort(),
    });

    try {
        u2fRes = await navigator.credentials.get(u2fReq);
    } catch (e) {
        if (e.name === "NotSupportedError") {
            throw new NFCMethodNotSupported("The call threw NotSupportedError. Please update your browser.");
        } else {
            throw new NFCOperationError("Failed to execute command. " + e.name + ": " + e.message);
        }
    }

    options.statusCallback("scanned", {
        execMethod: "credential",
        execStep: "get-credential-done",
        cancelScan: () => ctrl.abort(),
    });

    let res = u2fRes.response.signature;
    let resBuf = new Uint8Array(res);

    if (resBuf.length === 2 && resBuf[0] === 0xE1) {
        if (ERROR_CODES.hasOwnProperty(resBuf[1])) {
            let err = ERROR_CODES[resBuf[1]];
            throw new HaloTagError(err[0], err[1]);
        } else {
            throw new HaloTagError("Command returned an unknown error: " + arr2hex(resBuf));
        }
    }

    return await new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve({
                "result": arr2hex(resBuf),
                "extra": {}
            });
        }, 1);
    });
}

module.exports = {
    execCredential
};
