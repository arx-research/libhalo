/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

const {HaloTagError, HaloLogicError, NFCOperationError, NFCMethodNotSupported} = require("../halo/exceptions");
const {ERROR_CODES} = require("../halo/errors");
const {arr2hex} = require("../halo/utils");

const FLAG_USE_NEW_MODE = 0x00;

async function execCredential(request, options) {
    if (!window.isSecureContext) {
        throw new NFCMethodNotSupported("This method can be invoked only in the secure context (HTTPS).");
    }

    options = Object.assign({}, options) || {};

    if (!options.debugCallback) {
        options.debugCallback = () => null;
    }

    if (!options.statusCallback) {
        options.statusCallback = () => null;
    }

    let challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    let encodedRequest;

    if (!options.compatibleCallMode) {
        encodedRequest = new Uint8Array([FLAG_USE_NEW_MODE, 0x00, ...request]);
    } else {
        encodedRequest = new Uint8Array([...request]);
    }

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
        }
    };

    let u2fRes;

    options.statusCallback("init", "credential", "get-credential");
    options.debugCallback("get-credential");

    try {
        u2fRes = await navigator.credentials.get(u2fReq);
    } catch (e) {
        if (e.name === "NotSupportedError") {
            throw new NFCMethodNotSupported("The call threw NotSupportedError. Please update your browser.");
        } else {
            throw new NFCOperationError("Failed to execute command. " + e.name + ": " + e.message);
        }
    }

    options.statusCallback("scanned", "credential", "get-credential-done");
    options.debugCallback("get-credential-done");

    let res = u2fRes.response.signature;
    let resBuf = new Uint8Array(res);

    if (!options.compatibleCallMode) {
        // the tag will respond with E101 (ERROR_UNKNOWN_CMD) if it doesn't understand new call protocol
        // which is available only since C5 version
        if (resBuf.length === 2 && resBuf[0] === 0xE1 && resBuf[1] === 0x01) {
            throw new HaloLogicError("Command failed. The tag doesn't support new call protocol. Please set options.compatibleCallMode = true.");
        }

        // 30 <remaining length> 04 00 04 <remaining length> <data ...>
        if (resBuf[0] !== 0x30 || resBuf[2] !== 0x04) {
            throw new HaloLogicError("Tag's response is not correctly structured.");
        }

        let skipLength = resBuf[3];

        // cut ASN.1 encoding to get pure response
        resBuf = resBuf.slice(skipLength + 6);
    }

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
