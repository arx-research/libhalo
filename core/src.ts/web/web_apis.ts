/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

import {
    arr2hex, hex2arr
} from "../halo/util";
import {__runTestSuite} from "../halo/tests";
import {haloCreateWs} from "./web_utils";

// libhalo web APIs
export * from '../api/common.tsx';
export * from '../api/web.tsx';

export {
    // extra utilities
    arr2hex,
    hex2arr,

    // extra util for bridge demo
    haloCreateWs,

    // internal, do not use
    __runTestSuite
};
