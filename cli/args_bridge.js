/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

import {ArgumentParser} from "argparse";

const parser = new ArgumentParser({
    description: 'HaLo Bridge Server'
});

parser.add_argument("-l", "--listen-host", {
    help: "IP where the server should bind",
    default: "127.0.0.1",
    dest: "listenHost"
});
parser.add_argument("-p", "--listen-port", {
    help: "Port where the server should bind (HTTP/WS)",
    type: "int",
    default: 32868,
    dest: "listenPort"
});
parser.add_argument("-P", "--listen-port-tls", {
    help: "Port where the server should bind (HTTPS/WSS)",
    type: "int",
    default: 32869,
    dest: "listenPortTLS"
});
parser.add_argument("-a", "--allow-origins", {
    help: "List of origins that are allowed to connect (semicolon-separated)",
    type: "str",
    default: null,
    dest: "allowOrigins"
});
parser.add_argument("--non-interactive", {
    help: "Non-interactive mode (don't launch the web browser)",
    dest: "nonInteractive",
    action: "store_true",
    "default": false
});
parser.add_argument("--reader", {
    help: "Name of the PC/SC reader to be used."
});

function parseArgs() {
    return parser.parse_args();
}

export {parseArgs};
