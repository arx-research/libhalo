/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

const {
    HaloTagError,
    HaloLogicError,
    NFCPermissionRequestDenied,
    NFCMethodNotSupported,
    NFCAbortedError,
    NFCOperationError
} = require("../halo/exceptions");
const {
    parsePublicKeys, convertSignature, recoverPublicKey, sigToDer,
    SECP256k1_ORDER, BJJ_ORDER
} = require("../halo/util");

/**
 * The LibHaLo stable API. Please don't depend on the functions imported from anywhere else
 * except the lib's index.js. The library's structure is subject to change in the next versions.
 */
module.exports = {
    // exported utils
    haloParsePublicKeys: parsePublicKeys,
    haloConvertSignature: convertSignature,
    haloRecoverPublicKey: recoverPublicKey,
    haloSignatureToDer: sigToDer,

    SECP256k1_ORDER,
    BJJ_ORDER,

    // exceptions
    HaloTagError,
    HaloLogicError,
    NFCPermissionRequestDenied,
    NFCMethodNotSupported,
    NFCAbortedError,
    NFCOperationError
};
