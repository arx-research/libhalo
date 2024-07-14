/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

import {
    HaloTagError,
    HaloLogicError,
    NFCPermissionRequestDenied,
    NFCMethodNotSupported,
    NFCAbortedError,
    NFCOperationError,
    NFCBadTransportError,
    NFCBridgeConsentError
} from "../halo/exceptions.js";
import {
    parsePublicKeys, convertSignature, recoverPublicKey, sigToDer,
    SECP256k1_ORDER, BJJ_ORDER
} from "../halo/util.js";

/**
 * The LibHaLo stable API. Please don't depend on the functions imported from anywhere else
 * except the lib's index.js. The library's structure is subject to change in the next versions.
 */
export {
    // exported utils
    parsePublicKeys as haloParsePublicKeys,
    convertSignature as haloConvertSignature,
    recoverPublicKey as haloRecoverPublicKey,
    sigToDer as haloSignatureToDer,

    SECP256k1_ORDER,
    BJJ_ORDER,

    // exceptions
    HaloTagError,
    HaloLogicError,
    NFCPermissionRequestDenied,
    NFCMethodNotSupported,
    NFCAbortedError,
    NFCOperationError,
    NFCBadTransportError,
    NFCBridgeConsentError
};
