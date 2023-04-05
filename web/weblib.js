/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

const {
    execHaloCmdWeb
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
const {JWEUtil} = require("../halo/jwe_util");
const WebSocketAsPromised = require("websocket-as-promised");
const {HaloGateway} = require("../halo/gateway/requestor");

function createWs(url) {
    return new WebSocketAsPromised(url, {
        packMessage: data => JSON.stringify(data),
        unpackMessage: data => JSON.parse(data),
        attachRequestId: (data, requestId) => Object.assign({uid: requestId}, data),
        extractRequestId: data => data && data.uid
    });
}

module.exports = {
    // utilities
    arr2hex,
    hex2arr,
    haloParsePublicKeys: parsePublicKeys,
    haloConvertSignature: convertSignature,
    haloRecoverPublicKey: recoverPublicKey,

    // for web usage
    execHaloCmdWeb,

    // for web usage with gateway
    HaloGateway,
    JWEUtil,
    createWs,

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
