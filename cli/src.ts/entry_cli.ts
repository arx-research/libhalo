/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

import {parseArgs} from './args_cli.ts';
import {runHalo} from "./cli.ts";
import {printVersionInfo, getVersionInfo} from "./version.ts";

let args = parseArgs();

if (args && args.name === "cli_version") {
    if (args.output === "json") {
        let versionInfo = getVersionInfo() ?? {};
        console.log(JSON.stringify(versionInfo));
    } else {
        printVersionInfo();
    }
}

if (!args || args.name === "cli_version") {
    process.exit(0);
}

runHalo("cli", args);
