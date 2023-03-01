const {ERROR_CODES} = require("../halo/errors");
const {
    HaloTagError,
    NFCMethodNotSupported,
    NFCPermissionRequestDenied,
    NFCAbortedError
} = require("../halo/exceptions");
const {arr2hex} = require("../halo/utils");

let ndef = null;
let ctrl = null;

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

    let writeStatus = "nfc-write";

    while (true) {
        if (ctrl) {
            ctrl.abort();
        }

        ctrl = new AbortController();

        try {
            options.debugCallback(writeStatus);

            if (writeStatus === "nfc-write") {
                options.statusCallback("init", "nfc-write");
            } else if (writeStatus === "nfc-write-error") {
                options.statusCallback("retry", "nfc-write-error");
            }

            await ndef.write({records: [{recordType: "unknown", data: request}]});
            break;
        } catch (e) {
            if (e.name === "NotAllowedError") {
                throw new NFCPermissionRequestDenied("NFC permission request denied by the user.");
            } else if (e.name === "AbortError") {
                throw new NFCAbortedError("Operation restarted by the user.");
            } else {
                writeStatus = "nfc-write-error";
            }
        }
    }

    await ndef.scan({signal: ctrl.signal});

    options.debugCallback("nfc-read");

    return new Promise((resolve, reject) => {
        ndef.onreadingerror = (event) => {
            options.debugCallback("nfc-read-error");
            options.statusCallback("retry", "nfc-read-error");
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
                options.statusCallback("scanned", "nfc-success");

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
                options.statusCallback("retry", "nfc-parse-error");
            }
        };
    });
}

module.exports = {
    execWebNFC
};
