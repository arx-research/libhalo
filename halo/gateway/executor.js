const {JWEUtil} = require("../jwe_util");

let currentCmd = null;
let jweUtil = new JWEUtil();
let wsp;

async function haloGateExecConnectWs() {
    let searchParts = window.location.hash.split('/');

    await jweUtil.loadKey(searchParts[2]);

    // TODO validate searchParts[1]
    let protocol;

    if (window.location.protocol === 'https:') {
        protocol = 'wss://';
    } else {
        protocol = 'ws://';
    }

    wsp = createWs(protocol + window.location.host + '/ws?side=executor&sessionId=' + searchParts[1]);

    wsp.onUnpackedMessage.addListener(async ev => {
        if (ev.type === "ping") {
            log("Received welcome from server. Waiting for command");
        } else if (ev.type === "requested_cmd") {
            let payload;

            try {
                payload = await jweUtil.decrypt(ev.payload);
            } catch (e) {
                log("Failed to validate or decrypt the command packet.");
                return;
            }

            log("Requested to execute the following command:\n" + JSON.stringify(payload.command, null, 4));
            currentCmd = payload;
            document.getElementById('click-btn').disabled = false;
        } else {
            log("Unknown packet:\n" + JSON.stringify(ev));
        }
    });

    wsp.onClose.addListener(event => {
        log('Connection closed: ' + event.code);
    });

    wsp.open();
}

async function haloGateExecConfirmButtonClicked(ev) {
    document.getElementById('click-btn').disabled = true;
    let res;
    let nonce = currentCmd.nonce;

    try {
        res = await execHaloCmdWeb(currentCmd.command);
    } catch (e) {
        document.getElementById('click-btn').disabled = false;
        return;
    }

    currentCmd = null;
    wsp.sendPacked({"type": "executed_cmd", "payload": await jweUtil.encrypt({
            response: res,
            nonce: nonce
        })});
    log("Executed command, result sent.");
}

module.exports = {
    haloGateExecConnectWs,
    haloGateExecConfirmButtonClicked
};
