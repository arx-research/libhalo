/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

import {parseArgs} from './args_cli.js';
import {runHalo} from "./cli.js";
import {printVersionInfo, getVersionInfo} from "./version.js";
import {getSimConfig, saveSimConfig} from "./util.js";

const args = parseArgs();

if (args && args.name === "cli_version") {
    if (args.output === "json") {
        const versionInfo = getVersionInfo() ?? {};
        console.log(JSON.stringify(versionInfo));
    } else {
        printVersionInfo();
    }
} else if (args && args.name === "sim_cfg") {
    const simConfig = {
        enabled: true,
        url: args.url,
        authSecret: args.secret,
        csetId: args.cset_id,
        simInstance: args.sim_instance
    };
    saveSimConfig(simConfig);
    console.log('Config updated.');
} else if (args && args.name === "sim_enable") {
    const simConfig = getSimConfig();
    simConfig.enabled = true;
    if (args.cset_id) {
        simConfig.csetId = args.cset_id;
    }
    if (args.sim_instance) {
        simConfig.simInstance = args.sim_instance;
    }
    saveSimConfig(simConfig);
    console.log('Config updated.');
} else if (args && args.name === "sim_disable") {
    const simConfig = getSimConfig();
    simConfig.enabled = false;
    saveSimConfig(simConfig);
    console.log('Config updated.');
}

if (!args || ["cli_version", "sim_cfg", "sim_enable", "sim_disable"].indexOf(args.name) !== -1) {
    process.exit(0);
}

runHalo("cli", args);
