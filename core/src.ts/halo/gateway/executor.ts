import {JWEUtil} from "../jwe_util.ts";
import queryString from "query-string";
import WebSocketAsPromised from "websocket-as-promised";
import {execHaloCmdWeb} from "../../drivers/web.ts";
import {HaloCommandObject} from "../../types.js";

let gatewayServerHost: string | null = null;
let currentCmd: HaloCommandObject | null = null;
let wsp: WebSocketAsPromised | null = null;
const jweUtil = new JWEUtil();

function createWs(url: string) {
    return new WebSocketAsPromised(url, {
        packMessage: data => JSON.stringify(data),
        unpackMessage: data => JSON.parse(data as string),
        attachRequestId: (data, requestId) => Object.assign({uid: requestId}, data),
        extractRequestId: data => data && data.uid
    });
}

function haloGateExecutorSetHost(newGatewayServerHost: string) {
    gatewayServerHost = newGatewayServerHost;
}

interface ExecutorLogCallback {
    (message: string): void
}

interface ExecutorNewCommandCallback {
    (command: HaloCommandObject): void
}

async function haloGateExecutorCreateWs(logCallback: ExecutorLogCallback, newCommandCallback: ExecutorNewCommandCallback) {
    let serverPrefix;
    const searchParts = window.location.hash.split('/');

    if (searchParts.length !== 3 || searchParts[0] !== "#!" || searchParts[2] !== "") {
        throw new Error("Malformed executor URL provided - failed to analyse fragment part.");
    }

    await jweUtil.loadKey(searchParts[1]);

    const qs = queryString.parse(window.location.search);

    if (!qs.id) {
        throw new Error("Malformed executor URL provided - failed to analyse query part.");
    }

    const sessionId = qs.id;

    if (!gatewayServerHost) {
        if (window.location.protocol === 'https:') {
            serverPrefix = 'wss://' + window.location.host;
        } else {
            serverPrefix = 'ws://' + window.location.host;
        }
    } else {
        serverPrefix = gatewayServerHost;
    }

    wsp = createWs(serverPrefix + '/ws?side=executor&sessionId=' + sessionId);

    wsp.onUnpackedMessage.addListener(async ev => {
        if (ev.type === "ping") {
            logCallback("Received welcome from server. Waiting for command to be requested.");
        } else if (ev.type === "requested_cmd") {
            let payload;

            try {
                payload = await jweUtil.decrypt(ev.payload);
            } catch (e) {
                logCallback("Failed to validate or decrypt the command packet.");
                return;
            }

            currentCmd = payload;
            newCommandCallback(payload.command);
        } else {
            logCallback("Unknown packet:\n" + JSON.stringify(ev));
        }
    });

    wsp.onClose.addListener(event => {
        logCallback('Connection closed. [' + event.code + '] ' + event.reason);
    });

    await wsp.open();
}

async function haloGateExecutorUserConfirm(logCallback: ExecutorLogCallback) {
    let res;
    const nonce = currentCmd.nonce;

    logCallback('Please tap HaLo tag to the back of your smartphone and hold it for a while...');

    try {
        res = {
            status: "success",
            output: await execHaloCmdWeb(currentCmd.command)
        };
    } catch (e) {
        const err = e as Error;

        res = {
            status: "exception",
            exception: {
                kind: err.constructor.name,
                name: err.name,
                message: err.message,
                stack: err.stack
            }
        }
    }

    logCallback('Command executed, sending result over the network...');

    currentCmd = null;
    wsp!.sendPacked({
        "type": "executed_cmd",
        "payload": await jweUtil.encrypt({
            response: res,
            nonce: nonce
        })
    });
}

export {
    haloGateExecutorSetHost,
    haloGateExecutorCreateWs,
    haloGateExecutorUserConfirm
};
