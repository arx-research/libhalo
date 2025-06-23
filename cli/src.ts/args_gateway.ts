/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

import {ArgumentParser} from "argparse";

const parser = new ArgumentParser({
    description: 'HaLo Gateway Server'
});

parser.add_argument("-l", "--listen-host", {
    help: "IP where the server should bind",
    default: "127.0.0.1",
    dest: "listenHost"
});
parser.add_argument("-p", "--listen-port", {
    help: "Port where the server should bind",
    type: "int",
    default: 32842,
    dest: "listenPort"
});
parser.add_argument("-d", "--disable-stats", {
    help: "Whether to disable the /stats page",
    default: false,
    dest: "disableStats",
    action: "store_true"
});
parser.add_argument("--disable-cache", {
    help: "Whether to disable template caching for easier development",
    default: false,
    dest: "disableCache",
    action: "store_true"
});

function parseArgs() {
    return parser.parse_args();
}

export {parseArgs};
