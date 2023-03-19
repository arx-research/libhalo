/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

const {ArgumentParser} = require("argparse");

const parser = new ArgumentParser({
    description: 'HaLo - Bridge Server'
});

parser.add_argument("-l", "--listen-host", {
    help: "IP where the server should bind",
    default: "127.0.0.1",
    dest: "listenHost"
});
parser.add_argument("-p", "--listen-port", {
    help: "Port where the server should bind",
    type: "int",
    default: 49437,
    dest: "listenPort"
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

function parseArgs() {
    return parser.parse_args();
}

module.exports = {parseArgs};
