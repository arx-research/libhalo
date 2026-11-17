import {JWEUtil} from "../jwe_util.js";
import queryString from "query-string";
import WebSocketAsPromised from "websocket-as-promised";
import {execHaloCmdWeb} from "../../drivers/web.js";
import {HaloCommandObject} from "../../types.js";

interface ExecutorPendingCommand {
    nonce: string
    command: HaloCommandObject
}

let gatewayServerHost: string | null = null;
let currentCmd: ExecutorPendingCommand | null = null;
let isExecuting = false;
let wsp: WebSocketAsPromised | null = null;
const jweUtil = new JWEUtil();

// nonces of all commands received in this session, used to reject replayed command packets
const seenNonces = new Set<string>();

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

            if (!payload || typeof payload !== "object"
                    || typeof payload.nonce !== "string"
                    || !payload.command || typeof payload.command !== "object"
                    || (payload.direction !== undefined && payload.direction !== "request")) {
                logCallback("Received malformed command packet, ignoring.");
                return;
            }

            if (seenNonces.has(payload.nonce)) {
                // the gateway server is able to re-send any encrypted packet it has seen before
                logCallback("Received a replayed command packet, ignoring.");
                return;
            }

            seenNonces.add(payload.nonce);

            if (currentCmd !== null || isExecuting) {
                // the requestor is not allowed to issue another command until the current one is executed,
                // so the command that the user is reviewing could never be silently swapped
                logCallback("Received another command while the previous one is still pending, ignoring.");
                return;
            }

            currentCmd = {nonce: payload.nonce, command: payload.command};
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
    let options = {};

    const credentialExecCmds = [
        "get_transport_pk",
        "load_transport_pk",
        "export_key",
        "import_key_init",
        "import_key"
    ];

    if (currentCmd === null || isExecuting) {
        logCallback('There is no command waiting for confirmation.');
        return;
    }

    // capture the command that the user has confirmed
    const cmd = currentCmd;
    isExecuting = true;

    if (cmd.command.name && credentialExecCmds.indexOf(cmd.command.name) !== -1) {
        options = {"method": "credential"};
    }

    logCallback('Please tap HaLo tag to the back of your smartphone and hold it for a while...');

    try {
        res = {
            status: "success",
            output: await execHaloCmdWeb(cmd.command, options)
        };
    } catch (e) {
        const err = e as Error;

        res = {
            status: "exception",
            exception: {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                kind: err.errorName ?? err.constructor.name,
                name: err.name,
                message: err.message,
                stack: err.stack
            }
        }
    }

    logCallback('Command executed, sending result over the network...');

    currentCmd = null;
    isExecuting = false;
    wsp!.sendPacked({
        "type": "executed_cmd",
        "payload": await jweUtil.encrypt({
            direction: "response",
            response: res,
            nonce: cmd.nonce
        })
    });
}

export {
    haloGateExecutorSetHost,
    haloGateExecutorCreateWs,
    haloGateExecutorUserConfirm
};
