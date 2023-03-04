/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

const {execHaloCmdRN} = require("./drivers/nfc_manager");
const {execHaloCmdPCSC} = require("./drivers/pcsc");
const {
    execHaloCmdWeb
} = require("./drivers/common");
const {
    HaloTagError,
    HaloLogicError,
    NFCPermissionRequestDenied,
    NFCMethodNotSupported,
    NFCAbortedError,
    NFCOperationError
} = require("./halo/exceptions");
const {parsePublicKeys} = require("./halo/utils");

/**
 * The LibHaLo stable API. Please don't depend on the functions imported from anywhere else
 * except the lib's index.js. The library's structure is subject to change in the next versions.
 */
module.exports = {
    // for desktop usage
    execHaloCmdPCSC,

    // for web usage
    execHaloCmdWeb,

    // for usage with react-native-nfc-manager
    execHaloCmdRN,

    // exported utils
    haloParsePublicKeys: parsePublicKeys,

    // exceptions
    HaloTagError,
    HaloLogicError,
    NFCPermissionRequestDenied,
    NFCMethodNotSupported,
    NFCAbortedError,
    NFCOperationError
};
