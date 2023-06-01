/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

const {execHaloCmdRN} = require("./drivers/nfc_manager");
const {execHaloCmdPCSC} = require("./drivers/pcsc");
const {
    execHaloCmdWeb, detectMethod
} = require("./drivers/common");
const {
    HaloTagError,
    HaloLogicError,
    NFCPermissionRequestDenied,
    NFCMethodNotSupported,
    NFCAbortedError,
    NFCOperationError
} = require("./halo/exceptions");
const {parsePublicKeys, convertSignature, recoverPublicKey} = require("./halo/utils");
const {HaloGateway} = require("./halo/gateway/requestor");
const {haloFindBridge} = require("./web/web_utils");

/**
 * The LibHaLo stable API. Please don't depend on the functions imported from anywhere else
 * except the lib's index.js. The library's structure is subject to change in the next versions.
 */
module.exports = {
    // for desktop usage
    execHaloCmdPCSC,

    // for web usage
    execHaloCmdWeb,
    haloFindBridge,
    haloGetDefaultMethod: detectMethod,

    // for web usage with gateway
    HaloGateway,

    // for usage with react-native-nfc-manager
    execHaloCmdRN,

    // exported utils
    haloParsePublicKeys: parsePublicKeys,
    haloConvertSignature: convertSignature,
    haloRecoverPublicKey: recoverPublicKey,

    // exceptions
    HaloTagError,
    HaloLogicError,
    NFCPermissionRequestDenied,
    NFCMethodNotSupported,
    NFCAbortedError,
    NFCOperationError
};
