const {NFCAbortedError, NFCMethodNotSupported} = require("../halo/exceptions");
const {execCredential} = require("./credential");
const {execWebNFC} = require("./webnfc");
const {execHaloCmd} = require("./common");

let isCallRunning = null;

function makeDefault(curValue, defaultValue) {
    if (typeof curValue === "undefined") {
        return defaultValue;
    }

    if (curValue === null) {
        return defaultValue;
    }

    return curValue;
}

/**
 * Detect the best command execution method for the current device.
 * @returns {string} Either "credential" or "webnfc".
 */
function detectMethod() {
    try {
        new NDEFReader();
    } catch (e) {
        // WebNFC not supported
        return "credential";
    }

    return "webnfc";
}

function defaultWebNFCStatusCallback(status) {
    console.log('running default callback'); // TODO

    if (!document.getElementById('__libhalo_popup_stylesheet')) {
        console.log('injecting scripts'); // TODO

        const style = document.createElement('style');
        style.setAttribute('id', '__libhalo_popup_stylesheet');
        style.textContent = `
#__libhalo_popup {
  position: fixed;
  padding: 10px;
  width: 340px;
  left: 50%;
  margin-left: -170px;
  font-size: 12px;
  text-align: center;
  height: 180px;
  top: 50%;
  margin-top: -100px;
  background: #FFF;
  z-index: 20;
}

#__libhalo_popup:after {
  position: fixed;
  content: "";
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  background: rgba(0,0,0,0.5);
  z-index: -2;
}

#__libhalo_popup:before {
  position: absolute;
  content: "";
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  background: #FFF;
  z-index: -1;
}`;
        document.head.append(style);
    }

    if (!document.getElementById('__libhalo_popup')) {
        console.log('injecting popup'); // TODO

        const pdiv1 = document.createElement('div');
        pdiv1.setAttribute('id', '__libhalo_popup');

        document.body.append(pdiv1);
    }

    const pdiv = document.getElementById('__libhalo_popup');
    let statusText = '<unknown>';

    switch (status) {
        case "init": statusText = "Please tap your HaLo tag to the back of your smartphone and hold it for a while..."; break;
        case "again": statusText = "Almost there... Please tap HaLo tag again..."; break;
        case "retry": statusText = "Something went wrong, please try again..."; break;
        case "scanned": statusText = "Scan successful, please wait..."; break;
        default: statusText = "<" + status + ">"; break;
    }

    pdiv.innerText = statusText;
    pdiv.style.display = status !== null ? 'block' : 'none';
}

/**
 * Execute the NFC command from the web browser.
 * @param command Command specification object.
 * @param options Additional options for the command executor.
 * @returns {Promise<*>} Command execution result.
 */
async function execHaloCmdWeb(command, options) {
    if (options && !options.noDebounce && isCallRunning) {
        throw new NFCAbortedError("The operation was debounced.");
    }

    isCallRunning = true;

    options = options ? Object.assign({}, options) : {};
    options.method = makeDefault(options.method, detectMethod());
    options.noDebounce = makeDefault(options.noDebounce, false);
    options.compatibleCallMode = makeDefault(options.compatibleCallMode, true);

    command = command ? Object.assign({}, command) : {};

    try {
        let cmdOpts = {};

        if (options.method === "credential") {
            cmdOpts = {
                method: "credential",
                exec: async (command) => await execCredential(command, {
                    statusCallback: options.statusCallback,
                    compatibleCallMode: options.compatibleCallMode
                })
            };
        } else if (options.method === "webnfc") {
            options.statusCallback = makeDefault(options.statusCallback, defaultWebNFCStatusCallback);

            cmdOpts = {
                method: "webnfc",
                exec: async (command) => await execWebNFC(command, {
                    statusCallback: options.statusCallback
                })
            };
        } else {
            throw new NFCMethodNotSupported("Unsupported options.method parameter specified.");
        }

        return await execHaloCmd(command, cmdOpts);
    } finally {
        if (options.statusCallback) {
            options.statusCallback(null);
        }

        isCallRunning = false;
    }
}

module.exports = {
    execHaloCmdWeb,
    detectMethod
};
