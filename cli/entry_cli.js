/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

const {parseArgs} = require('./args_cli.js');
const {runHalo} = require("./cli");
const {printVersionInfo} = require("./version");

let args = parseArgs();

if (!args || args.name === "cli_version") {
    printVersionInfo();
    process.exit(0);
}

runHalo("cli", args);
