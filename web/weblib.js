/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

const {
    arr2hex, hex2arr
} = require("../halo/utils");
const {__runTestSuite} = require("../halo/tests");
const {haloCreateWs} = require("./web_utils");

module.exports = {
    // libhalo web APIs
    ...require('../api/common.js'),
    ...require('../api/web.js'),

    // extra utilities
    arr2hex,
    hex2arr,

    // extra util for bridge demo
    haloCreateWs,

    // internal, do not use
    __runTestSuite
};

if (window) {
    Object.keys(module.exports).forEach((key) => {
        window[key] = module.exports[key];
    });
}
