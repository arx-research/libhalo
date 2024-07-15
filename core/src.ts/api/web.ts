/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

import {HaloGateway} from "../halo/gateway/requestor.js";
import {HaloBridge} from "../halo/bridge.js";
import {haloFindBridge} from "../web/web_utils.js";
import {haloGateExecutorCreateWs, haloGateExecutorUserConfirm, haloGateExecutorSetHost} from "../halo/gateway/executor.js";
import {execHaloCmdWeb, detectMethod} from "../drivers/web.js";
import {checkWebNFCPermission} from "../drivers/webnfc.js";

/**
 * The LibHaLo stable API. Please don't depend on the functions imported from anywhere else
 * except the lib's index.js. The library's structure is subject to change in the next versions.
 */
export {
    // for web usage
    execHaloCmdWeb,
    haloFindBridge,
    detectMethod as haloGetDefaultMethod,
    checkWebNFCPermission as haloCheckWebNFCPermission,

    // for web usage with gateway
    HaloGateway,
    haloGateExecutorSetHost,
    haloGateExecutorCreateWs,
    haloGateExecutorUserConfirm,

    // for web usage with bridge
    HaloBridge
};
