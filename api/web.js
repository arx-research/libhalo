/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

const {
    execHaloCmdWeb, detectMethod
} = require("../drivers/common");
const {HaloGateway} = require("../halo/gateway/requestor");
const {haloFindBridge} = require("../web/web_utils");
const {haloGateExecutorCreateWs, haloGateExecutorUserConfirm} = require("../halo/gateway/executor");

/**
 * The LibHaLo stable API. Please don't depend on the functions imported from anywhere else
 * except the lib's index.js. The library's structure is subject to change in the next versions.
 */
module.exports = {
    // for web usage
    execHaloCmdWeb,
    haloFindBridge,
    haloGetDefaultMethod: detectMethod,

    // for web usage with gateway
    HaloGateway,
    haloGateExecutorCreateWs,
    haloGateExecutorUserConfirm,
};
