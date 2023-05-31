/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

const {
    execHaloCmdWeb, detectMethod
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
    arr2hex, hex2arr, parsePublicKeys, convertSignature, recoverPublicKey
} = require("../halo/utils");
const {__runTestSuite} = require("../halo/tests");
const {HaloGateway} = require("../halo/gateway/requestor");
const {haloGateExecutorCreateWs, haloGateExecutorUserConfirm} = require("../halo/gateway/executor");
const {haloFindBridge, haloCreateWs} = require("./web_utils");

module.exports = {
    // utilities
    arr2hex,
    hex2arr,
    haloParsePublicKeys: parsePublicKeys,
    haloConvertSignature: convertSignature,
    haloRecoverPublicKey: recoverPublicKey,

    // for web usage
    execHaloCmdWeb,
    haloFindBridge,
    haloGetDefaultMethod: detectMethod,

    // for bridge demo
    haloCreateWs,

    // for web usage with gateway
    HaloGateway,
    haloGateExecutorCreateWs,
    haloGateExecutorUserConfirm,

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
