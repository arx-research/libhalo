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
parser.add_argument("--trusted-proxies", {
    help: "Comma-separated list of reverse proxies whose X-Forwarded-For header should be trusted when " +
        "resolving the client's IP address. Accepts IP addresses, CIDR ranges (e.g. 172.16.0.0/12) and presets: " +
        "loopback, linklocal, uniquelocal (alias: private). By default, no proxies are trusted.",
    type: "str",
    default: "",
    dest: "trustedProxies"
});
parser.add_argument("--max-sessions-per-ip", {
    help: "Maximum number of concurrent requestor sessions per client IP address (0 = unlimited)",
    type: "int",
    default: 15,
    dest: "maxSessionsPerIP"
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
