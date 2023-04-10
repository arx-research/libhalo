const {JWEUtil} = require("../jwe_util");

let currentCmd = null;
let jweUtil = new JWEUtil();
let wsp;

async function haloGateExecutorCreateWs(logCallback) {
    let protocol;
    let searchParts = window.location.hash.split('/');
    await jweUtil.loadKey(searchParts[2]);

    if (window.location.protocol === 'https:') {
        protocol = 'wss://';
    } else {
        protocol = 'ws://';
    }

    wsp = createWs(protocol + window.location.host + '/ws?side=executor&sessionId=' + searchParts[1]);

    wsp.onUnpackedMessage.addListener(async ev => {
        if (ev.type === "ping") {
            logCallback("Received welcome from server. Waiting for command");
        } else if (ev.type === "requested_cmd") {
            let payload;

            try {
                payload = await jweUtil.decrypt(ev.payload);
            } catch (e) {
                logCallback("Failed to validate or decrypt the command packet.");
                return;
            }

            logCallback("Requested to execute the following command:\n" + JSON.stringify(payload.command, null, 4));
            currentCmd = payload;
            document.getElementById('click-btn').disabled = false;
        } else {
            logCallback("Unknown packet:\n" + JSON.stringify(ev));
        }
    });

    wsp.onClose.addListener(event => {
        logCallback('Connection closed: ' + event.code);
    });

    wsp.open();
}

async function haloGateExecutorUserConfirm(logCallback) {
    let res;
    let nonce = currentCmd.nonce;

    logCallback('Please tap HaLo tag to the back of your smartphone and hold it for a while...');

    try {
        res = await execHaloCmdWeb(currentCmd.command);
    } catch (e) {
        throw e;
    }

    logCallback('Command executed, sending result over the network...');

    currentCmd = null;
    wsp.sendPacked({
        "type": "executed_cmd",
        "payload": await jweUtil.encrypt({
            response: res,
            nonce: nonce
        })
    });
}

module.exports = {
    haloGateExecutorCreateWs,
    haloGateExecutorUserConfirm
};
