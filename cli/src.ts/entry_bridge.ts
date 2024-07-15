/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

import {parseArgs} from './args_bridge.ts';
import {runHalo} from "./cli.ts";
import {printVersionInfo} from "./version.ts";

let args = parseArgs();

if (!args) {
    process.exit(0);
}

printVersionInfo();
runHalo("server", args);
