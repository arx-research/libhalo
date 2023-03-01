const {initNFCManagerHalo} = require("./fronts/nfc_manager");
const {execHaloCmdPCSC} = require("./fronts/pcsc");
const {
    execHaloCmdWeb,
    execHaloCmd
} = require("./fronts/common");
const {
    HaloTagError,
    HaloLogicError,
    NFCPermissionRequestDenied,
    NFCMethodNotSupported,
    NFCAbortedError,
    NFCOperationError
} = require("./halo/exceptions");

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
