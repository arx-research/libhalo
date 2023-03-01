const {initNFCManagerHalo} = require("./drivers/nfc_manager");
const {execHaloCmdPCSC} = require("./drivers/pcsc");
const {
    execHaloCmdWeb,
    execHaloCmd
} = require("./drivers/common");
const {
    HaloTagError,
    HaloLogicError,
    NFCPermissionRequestDenied,
    NFCMethodNotSupported,
    NFCAbortedError,
    NFCOperationError
} = require("./halo/exceptions");

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
    initNFCManagerHalo,
    execHaloCmd,

    // exceptions
    HaloTagError,
    HaloLogicError,
    NFCPermissionRequestDenied,
    NFCMethodNotSupported,
    NFCAbortedError,
    NFCOperationError
};
