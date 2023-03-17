const { WebSocketServer } = require('ws');
const crypto = require('crypto').webcrypto;
const {execHaloCmdPCSC} = require('../index.js');

let wss = null;

let currentWsClient = null;
let currentState = null;

function generateHandle() {
    return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64');
}

function generateAuthPin() {
    let val = Buffer.from(crypto.getRandomValues(new Uint8Array(3))).toString('hex');
    return val.slice(0, 3) + '-' + val.slice(3);
}

function sendToCurrentWs(ws, data) {
    if (currentWsClient !== null && (ws === null || currentWsClient === ws)) {
        console.log('send', data);
        currentWsClient.send(JSON.stringify(data));
        return true;
    }

    return false;
}

function wsEventCardConnected(reader) {
    if (currentState) {
        sendToCurrentWs(null, {
            "event": "handle_removed",
            "uid": null,
            "data": {
                "handle": currentState.handle
            }
        });
    }

    let handle = generateHandle();
    currentState = {"handle": handle, "reader": reader};
    sendToCurrentWs(null, {
        "event": "handle_added",
        "uid": null,
        "data": {
            "handle": handle
        }
    });
}

function wsEventCardDisconnected(reader) {
    if (currentState !== null && currentState.reader === reader) {
        sendToCurrentWs(null, {
            "event": "handle_removed",
            "uid": null,
            "data": {
                "handle": currentState.handle
            }
        });
        currentState = null;
    }
}

function wsCreateServer(args) {
    wss = new WebSocketServer({host: args.listenHost, port: args.listenPort});

    wss.on('connection', (ws, req) => {
        let originHostname = new URL(req.headers.origin).hostname;

        if (args.allowOrigins) {
            let allowedOrigins = args.allowOrigins.split(';');

            if (!allowedOrigins.includes(req.headers.origin)) {
                ws.close(4002, "Connecting origin is not on the configured allow list.");
                return;
            }
        } else if (originHostname !== "localhost" || originHostname !== "127.0.0.1") {
            ws.close(4003, "Connecting origin is not localhost. No other allowed origins are configured.");
            return;
        }

        if (currentWsClient) {
            currentWsClient.close(4001, "New client has connected. Server has dropped the current connection.");
        }

        currentWsClient = ws;

        ws.on('error', console.error);

        ws.on('message', async function message(data) {
            if (currentWsClient !== ws) {
                return;
            }

            let packet = JSON.parse(data);
            console.log('recv', packet);

            if (packet.type === "exec_halo") {
                try {
                    if (!currentState || packet.handle !== currentState.handle) {
                        throw new Error("Invalid handle.");
                    }

                    let res = await execHaloCmdPCSC(packet.command, currentState.reader);
                    sendToCurrentWs(ws, {
                        "event": "exec_success",
                        "uid": packet.uid,
                        "data": {
                            "res": res
                        }
                    });
                } catch (e) {
                    sendToCurrentWs(ws, {
                        "event": "exec_exception",
                        "uid": packet.uid,
                        "data": {
                            "exception": {
                                "message": String(e),
                                "stack": e.stack
                            }
                        }
                    });
                }
            }
        });

        sendToCurrentWs(ws, {
            "event": "ws_connected",
            "uid": null,
            "data": {}
        });

        if (currentState) {
            sendToCurrentWs(null, {
                "event": "handle_added",
                "uid": null,
                "data": {
                    "handle": currentState.handle
                }
            });
        }
    });
}

module.exports = {wsCreateServer, wsEventCardConnected, wsEventCardDisconnected};
