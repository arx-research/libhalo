/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

const {
    execHaloCmdWeb,
} = require("../drivers/common");
const {
    HaloTagError,
    HaloLogicError,
    NFCPermissionRequestDenied,
    NFCMethodNotSupported,
    NFCAbortedError,
    NFCOperationError
} = require("../halo/exceptions");
const {
    arr2hex, hex2arr, parsePublicKeys, convertSignature
} = require("../halo/utils");
const {__runTestSuite} = require("../halo/tests");

module.exports = {
    // utilities
    arr2hex,
    hex2arr,
    haloParsePublicKeys: parsePublicKeys,
    haloConvertSignature: convertSignature,

    // for web usage
    execHaloCmdWeb,

    // exceptions
    HaloTagError,
    HaloLogicError,
    NFCPermissionRequestDenied,
    NFCMethodNotSupported,
    NFCAbortedError,
    NFCOperationError,

    // internal, do not use
    __runTestSuite
};

if (window) {
    Object.keys(module.exports).forEach((key) => {
        window[key] = module.exports[key];
    });
}
