/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

import {
    arr2hex, hex2arr
} from "../halo/util.js";
import {__runTestSuite} from "../halo/tests.js";
import {haloCreateWs} from "./web_utils.js";

// libhalo web APIs
export * from '../api/common.js';
export * from '../api/web.js';

export {
    // extra utilities
    arr2hex,
    hex2arr,

    // extra util for bridge demo
    haloCreateWs,

    // internal, do not use
    __runTestSuite
};
