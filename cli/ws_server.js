const express = require('express');
const nunjucks = require("nunjucks");
const {WebSocketServer} = require('ws');
const crypto = require('crypto').webcrypto;
const {execHaloCmdPCSC} = require('../index.js');
const {dirname} = require("./util");

let wss = null;

let currentWsClient = null;
let currentState = null;

function generateHandle() {
    return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64');
}

function sendToCurrentWs(ws, data) {
    console.log('send', data);

    if (currentWsClient !== null && (ws === null || currentWsClient === ws)) {
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
                "handle": currentState.handle,
                "reader_name": currentState.reader.reader.name
            }
        });
    }

    let handle = generateHandle();
    currentState = {"handle": handle, "reader": reader};
    sendToCurrentWs(null, {
        "event": "handle_added",
        "uid": null,
        "data": {
            "handle": handle,
            "reader_name": reader.reader.name
        }
    });
}

function wsEventCardDisconnected(reader) {
    if (currentState !== null && currentState.reader === reader) {
        sendToCurrentWs(null, {
            "event": "handle_removed",
            "uid": null,
            "data": {
                "handle": currentState.handle,
                "reader_name": reader.reader.name
            }
        });
        currentState = null;
    }
}

function wsEventReaderConnected(reader) {
    sendToCurrentWs(null, {
        "event": "reader_added",
        "uid": null,
        "data": {
            "reader_name": reader.reader.name
        }
    });
}

function wsEventReaderDisconnected(reader) {
    sendToCurrentWs(null, {
        "event": "reader_removed",
        "uid": null,
        "data": {
            "reader_name": reader.reader.name
        }
    });
}

function wsCreateServer(args, getReaderNames) {
    const app = express();
    const server = app.listen(args.listenPort, args.listenHost);

    wss = new WebSocketServer({noServer: true});

    app.use('/assets/static', express.static(dirname + '/assets/static'));

    nunjucks.configure(dirname + '/assets/views', {
        autoescape: true,
        express: app
    });

    app.get('/', (req, res) => {
        res.render('ws_client.html');
    });

    server.on('upgrade', (request, socket, head) => {
        wss.handleUpgrade(request, socket, head, socket => {
            wss.emit('connection', socket, request);
        });
    });

    wss.on('connection', (ws, req) => {
        let originHostname = new URL(req.headers.origin).hostname;

        if (args.allowOrigins) {
            let allowedOrigins = args.allowOrigins.split(';');

            if (!allowedOrigins.includes(req.headers.origin)) {
                ws.close(4002, "Connecting origin is not on the configured allow list.");
                return;
            }
        } else if (originHostname !== "localhost" && originHostname !== "127.0.0.1") {
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

        let readerNames = getReaderNames();

        for (let readerName of readerNames) {
            sendToCurrentWs(null, {
                "event": "reader_added",
                "uid": null,
                "data": {
                    "reader_name": readerName
                }
            });
        }

        if (currentState) {
            sendToCurrentWs(null, {
                "event": "handle_added",
                "uid": null,
                "data": {
                    "handle": currentState.handle,
                    "reader_name": currentState.reader.reader.name
                }
            });
        }
    });
}

module.exports = {
    wsCreateServer,
    wsEventCardConnected,
    wsEventCardDisconnected,
    wsEventReaderConnected,
    wsEventReaderDisconnected
};
