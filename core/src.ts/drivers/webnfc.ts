/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

import {ERROR_CODES} from "../halo/errors.js";
import {
    HaloTagError,
    NFCMethodNotSupported,
    NFCPermissionRequestDenied,
    NFCAbortedError
} from "../halo/exceptions.js";
import {arr2hex, hex2arr, isWebDebugEnabled} from "../halo/util.js";
import {ExecOptions, ExecReturnStruct} from "../types.js";
import type {NDEFReader} from "../types_webnfc.js";
import {Buffer} from 'buffer/index.js';

let ndef: NDEFReader | null = null;
let ctrl: AbortController | null = null;
let blurEventInstalled = false;

function detectWindowMinimized() {
    if (document.hidden && ctrl) {
        /*
        Once the web page gets minimized, the call to NFCReader.scan() or NFCReader.write() might still appear
        to be running, although the NFC scanning feature will be glitched. We need to detect that the page
        was minimized and abort the call in order to work around the bug.
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
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const ndef = new window.NDEFReader() as NDEFReader;
        await ndef.scan({ signal: controller.signal });
        controller.abort();
        return true;
    } catch (e) {
        if ((<Error> e).name === "NotAllowedError") {
            return false;
        }

        throw e;
    }
}

async function execWebNFC(request: Buffer, options: ExecOptions): Promise<ExecReturnStruct> {
    const webDebug = isWebDebugEnabled();

    if (webDebug) {
        console.log('[libhalo] execWebNFC() request:', arr2hex(request));
        console.log('[libhalo] execWebNFC() checking WebNFC permission')
    }

    let isWebNFCGranted;

    try {
        isWebNFCGranted = await checkWebNFCPermission();
    } catch (e) {
        if (webDebug) {
            console.log('[libhalo] execWebNFC() internal error checking WebNFC permission:', e);
        }

        throw new NFCMethodNotSupported("Internal error when checking WebNFC permission: " + (<Error> e).toString());
    }

    if (!isWebNFCGranted) {
        if (webDebug) {
            console.log('[libhalo] execWebNFC() WebNFC permission is denied');
        }

        throw new NFCPermissionRequestDenied("NFC permission request denied by the user.");
    }

    options = Object.assign({}, options) || {};

    if (!options.statusCallback) {
        options.statusCallback = () => null;
    }

    if (!ndef) {
        try {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            ndef = new window.NDEFReader() as NDEFReader;
        } catch (e) {
            if (webDebug) {
                console.log('[libhalo] execWebNFC() failed createing NDEFReader');
            }

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
            if (writeStatus === "nfc-write") {
                options.statusCallback("init", {
                    execMethod: "webnfc",
                    execStep: "nfc-write",
                    cancelScan: () => ctrl && ctrl.abort(),
                });
            } else if (writeStatus === "nfc-write-error") {
                options.statusCallback("retry", {
                    execMethod: "webnfc",
                    execStep: "nfc-write-error",
                    cancelScan: () => ctrl && ctrl.abort(),
                });
            }

            if (webDebug) {
                console.log('[libhalo] execWebNFC() performing write:', request);
            }

            await ndef.write({
                records: [{recordType: "unknown", data: request}]
            }, {
                signal: ctrl.signal
            });
            break;
        } catch (e) {
            if (webDebug) {
                console.log('[libhalo] execWebNFC() write exception:', e);
            }

            if ((<Error> e).name === "NotAllowedError") {
                throw new NFCPermissionRequestDenied("NFC permission request denied by the user.");
            } else if ((<Error> e).name === "AbortError") {
                throw new NFCAbortedError("Operation restarted by the user or webpage minimized (during write).");
            } else {
                writeStatus = "nfc-write-error";
            }
        }
    }

    if (webDebug) {
        console.log('[libhalo] execWebNFC() performing read');
    }

    await ndef.scan({signal: ctrl.signal});

    options.statusCallback("again", {
        execMethod: "webnfc",
        execStep: "nfc-read",
        cancelScan: () => ctrl && ctrl.abort(),
    });

    return new Promise((resolve, reject) => {
        ctrl!.signal.addEventListener('abort', () => {
            if (webDebug) {
                console.log('[libhalo] execWebNFC() operation aborted during read');
            }

            reject(new NFCAbortedError("Operation restarted by the user or webpage minimized (during read)."));
        });

        if (ctrl!.signal.aborted) {
            if (webDebug) {
                console.log('[libhalo] execWebNFC() operation aborted during read');
            }

            reject(new NFCAbortedError("Operation restarted by the user or webpage minimized (during read)."));
        }

        ndef!.onreadingerror = (event) => {
            if (webDebug) {
                console.log('[libhalo] execWebNFC() read error');
            }

            if (options.statusCallback) {
                options.statusCallback("retry", {
                    execMethod: "webnfc",
                    execStep: "nfc-read-error",
                    cancelScan: () => ctrl && ctrl.abort(),
                });
            }
        };

        ndef!.onreading = (event) => {
            if (webDebug) {
                console.log('[libhalo] execWebNFC() read event received, parsing');
            }

            try {
                const out: Record<string, string> = {};
                const decoded = new TextDecoder("utf-8").decode(event.message.records[0].data);
                const url = new URL(decoded);

                if (webDebug) {
                    console.log('[libhalo] execWebNFC() read result url:', url);
                }

                for (const k of url.searchParams.keys()) {
                    out[k] = url.searchParams.get(k)!;
                }

                const resBuf = hex2arr(out.res);

                if (resBuf[0] === 0xE1) {
                    if (webDebug) {
                        console.log('[libhalo] execWebNFC() command fail:', arr2hex(resBuf));
                    }

                    if (Object.prototype.hasOwnProperty.call(ERROR_CODES, resBuf[1])) {
                        const err = ERROR_CODES[resBuf[1]];
                        ndef!.onreading = () => null;
                        ndef!.onreadingerror = () => null;
                        reject(new HaloTagError(err[0], err[1]));
                    } else {
                        ndef!.onreading = () => null;
                        ndef!.onreadingerror = () => null;

                        const errCode = arr2hex([resBuf[1]]);
                        reject(new HaloTagError("ERROR_CODE_" + errCode, "Command returned an unknown error: " + arr2hex(resBuf)));
                    }

                    return;
                }

                if (options.statusCallback) {
                    options.statusCallback("scanned", {
                        execMethod: "webnfc",
                        execStep: "nfc-success",
                        cancelScan: () => ctrl && ctrl.abort(),
                    });
                }

                ndef!.onreading = () => null;
                ndef!.onreadingerror = () => null;

                delete out['res'];

                if (webDebug) {
                    console.log('[libhalo] execWebNFC() command result:', arr2hex(resBuf));
                }

                setTimeout(() => {
                    resolve({
                        result: arr2hex(resBuf),
                        extra: out
                    });
                }, 1);
            } catch (e) {
                if (webDebug) {
                    console.log('[libhalo] execWebNFC() parse error:', e);
                }

                if (options.statusCallback) {
                    options.statusCallback("retry", {
                        execMethod: "webnfc",
                        execStep: "nfc-parse-error",
                        cancelScan: () => ctrl && ctrl.abort(),
                    });
                }
            }
        };
    });
}

export {
    checkWebNFCPermission,
    execWebNFC
};
