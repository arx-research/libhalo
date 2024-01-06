/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

const {ArgumentParser} = require("argparse");
const {printVersionInfo} = require("./version");

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

function parseArgs() {
    printVersionInfo();
    return parser.parse_args();
}

module.exports = {parseArgs};
