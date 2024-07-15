/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

import {HaloTagError, NFCOperationError, NFCMethodNotSupported} from "../halo/exceptions.js";
import {ERROR_CODES} from "../halo/errors.js";
import {arr2hex, isWebDebugEnabled} from "../halo/util.js";
import {ExecOptions, ExecReturnStruct} from "../types.js";
import {Buffer} from 'buffer/index.js';

async function execCredential(request: Buffer, options: ExecOptions): Promise<ExecReturnStruct> {
    const webDebug = isWebDebugEnabled();

    if (webDebug) {
        console.log('[libhalo] execCredential() request:', arr2hex(request));
    }

    if (!window.isSecureContext) {
        throw new NFCMethodNotSupported("This method can be invoked only in the secure context (HTTPS).");
    }

    options = Object.assign({}, options) || {};

    if (!options.statusCallback) {
        options.statusCallback = () => null;
    }

    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const encodedRequest = new Uint8Array([...request]);
    const ctrl = new AbortController();
    const u2fReq: CredentialRequestOptions = {
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

    if (webDebug) {
        console.log('[libhalo] execCredential() req:', u2fReq);
    }

    let u2fRes;

    options.statusCallback("init", {
        execMethod: "credential",
        execStep: "get-credential",
        cancelScan: () => ctrl.abort(),
    });

    try {
        u2fRes = await navigator.credentials.get(u2fReq) as PublicKeyCredential;
    } catch (e) {
        if (webDebug) {
            console.log('[libhalo] execCredential() exception:', e);
        }

        if ((<Error> e).name === "NotSupportedError") {
            throw new NFCMethodNotSupported("The call threw NotSupportedError. Please update your browser.");
        } else {
            throw new NFCOperationError("Failed to execute command. " + (<Error> e).name + ": " + (<Error> e).message);
        }
    }

    if (webDebug) {
        console.log('[libhalo] execCredential() res:', u2fRes);
    }

    options.statusCallback("scanned", {
        execMethod: "credential",
        execStep: "get-credential-done",
        cancelScan: () => ctrl.abort(),
    });

    const res = (u2fRes.response as AuthenticatorAssertionResponse).signature;
    const resBuf = new Uint8Array(res);

    if (resBuf.length === 2 && resBuf[0] === 0xE1) {
        if (webDebug) {
            console.log('[libhalo] execCredential() command fail:', arr2hex(resBuf));
        }

        if (Object.prototype.hasOwnProperty.call(ERROR_CODES, resBuf[1])) {
            const err = ERROR_CODES[resBuf[1]];
            throw new HaloTagError(err[0], err[1]);
        } else {
            const errCode = arr2hex([resBuf[1]]);
            throw new HaloTagError("ERROR_CODE_" + errCode, "Command returned an unknown error: " + arr2hex(resBuf));
        }
    }

    if (webDebug) {
        console.log('[libhalo] execCredential() command result:', arr2hex(resBuf));
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

export {
    execCredential
};
