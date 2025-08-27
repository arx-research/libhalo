/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

import {execHaloCmd, checkErrors} from "../drivers/common.js";

/**
 * The LibHaLo stable API. Please don't depend on the functions imported from anywhere else
 * except the lib's api/ subdirectory. The library's structure is subject to change in the next versions.
 */
export {
    execHaloCmd,
    checkErrors,
};
