/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

const {ERROR_CODES} = require("../halo/errors");
const {
    HaloTagError,
    NFCMethodNotSupported,
    NFCPermissionRequestDenied,
    NFCAbortedError
} = require("../halo/exceptions");
const {arr2hex, hex2arr} = require("../halo/utils");

let ndef = null;
let ctrl = null;
let blurEventInstalled = false;

function detectWindowMinimized() {
    if (ctrl) {
        /*
        Once the web page gets minimized, the call to NFCReader.scan() or NFCReader.write() might still appear
        to be running, although the NFC scanning feature will be glitched. We need to detect that the page
        was minimized and abort the call in order to work-around the bug.
         */
        ctrl.abort();
    }
}

/**
 * Check if user has granted us permission to use WebNFC interface.
 * @returns {Promise<boolean>}
 */
async function checkWebNFCPermission() {
    if (!window.isSecureContext) {
        throw new NFCMethodNotSupported("This method can be invoked only in the secure context (HTTPS).");
    }

    try {
        const controller = new AbortController();
        const ndef = new NDEFReader();
        await ndef.scan({ signal: controller.signal });
        controller.abort();
        return true;
    } catch (e) {
        if (e.name === "NotAllowedError") {
            return false;
        }

        throw e;
    }
}

async function execWebNFC(request, options) {
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

    options.debugCallback("nfc-init");

    if (!ndef) {
        try {
            ndef = new NDEFReader();
        } catch (e) {
            if (e instanceof ReferenceError) {
                throw new NFCMethodNotSupported("Method is not supported by the browser or device.");
            } else {
                throw e;
            }
        }
    }

    if (!blurEventInstalled) {
        window.addEventListener('visibilitychange', detectWindowMinimized);
        blurEventInstalled = true;
    }

    let writeStatus = "nfc-write";

    while (true) {
        if (ctrl) {
            ctrl.abort();
        }

        ctrl = new AbortController();

        try {
            options.debugCallback(writeStatus);

            if (writeStatus === "nfc-write") {
                options.statusCallback("init", "webnfc", "nfc-write");
            } else if (writeStatus === "nfc-write-error") {
                options.statusCallback("retry", "webnfc", "nfc-write-error");
            }

            await ndef.write({
                records: [{recordType: "unknown", data: request}]
            }, {
                signal: ctrl.signal
            });
            break;
        } catch (e) {
            if (e.name === "NotAllowedError") {
                throw new NFCPermissionRequestDenied("NFC permission request denied by the user.");
            } else if (e.name === "AbortError") {
                throw new NFCAbortedError("Operation restarted by the user or webpage minimized (during write).");
            } else {
                writeStatus = "nfc-write-error";
            }
        }
    }

    await ndef.scan({signal: ctrl.signal});

    options.debugCallback("nfc-read");

    return new Promise((resolve, reject) => {
        ctrl.signal.addEventListener('abort', () => {
            reject(new NFCAbortedError("Operation restarted by the user or webpage minimized (during read)."));
        });

        if (ctrl.signal.aborted) {
            reject(new NFCAbortedError("Operation restarted by the user or webpage minimized (during read)."));
        }

        ndef.onreadingerror = (event) => {
            options.debugCallback("nfc-read-error");
            options.statusCallback("retry", "webnfc", "nfc-read-error");
        };

        ndef.onreading = (event) => {
            try {
                let out = {};
                let decoded = new TextDecoder("utf-8").decode(event.message.records[0].data);
                let url = new URL(decoded);

                for (let k of url.searchParams.keys()) {
                    out[k] = url.searchParams.get(k);
                }

                let resBuf = hex2arr(out.res);

                if (resBuf[0] === 0xE1) {
                    if (ERROR_CODES.hasOwnProperty(resBuf[1])) {
                        let err = ERROR_CODES[resBuf[1]];
                        ndef.onreading = () => null;
                        ndef.onreadingerror = () => null;
                        reject(new HaloTagError(err[0], err[1]));
                    } else {
                        ndef.onreading = () => null;
                        ndef.onreadingerror = () => null;
                        reject(new HaloTagError("Command returned an unknown error: " + arr2hex(resBuf)));
                    }

                    return;
                }

                options.debugCallback("nfc-success");
                options.statusCallback("scanned", "webnfc", "nfc-success");

                ndef.onreading = () => null;
                ndef.onreadingerror = () => null;

                delete out['res'];

                setTimeout(() => {
                    resolve({
                        result: arr2hex(resBuf),
                        extra: out
                    });
                }, 1);
            } catch (e) {
                options.debugCallback("nfc-parse-error");
                options.statusCallback("retry", "webnfc", "nfc-parse-error");
            }
        };
    });
}

module.exports = {
    checkWebNFCPermission,
    execWebNFC
};
