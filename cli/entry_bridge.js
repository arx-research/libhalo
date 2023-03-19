/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

const {parseArgs} = require('./args_bridge.js');
const {runHalo} = require("./cli");

let args = parseArgs();

if (!args) {
    process.exit(0);
}

runHalo("server", args);
