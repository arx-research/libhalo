/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

const crypto = require('crypto').webcrypto;
const {parseArgs} = require('./args_gateway.js');
const express = require("express");
const {WebSocketServer} = require("ws");
const queryString = require('query-string');
const {dirname} = require("./util");
const nunjucks = require("nunjucks");

const MAX_SESSION_LIMIT = 1000;

let args = parseArgs();

if (!args) {
    process.exit(0);
}

let sessionIds = {};

function processRequestor(ws) {
    if (Object.keys(sessionIds).length >= MAX_SESSION_LIMIT) {
        ws.close(4053, "Too many connections.");
        return;
    }

    let sessionId = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex');

    sessionIds[sessionId] = {
        "requestor": ws,
        "executor": null,
        "requestUID": null
    };

    let sobj = sessionIds[sessionId];

    ws.on('error', console.error);

    ws.on('close', function close() {
        if (sobj.executor) {
            sobj.executor.close(4051, "Requestor closed the connection.");
        }

        console.log('Deleting ' + sessionId);
        delete sessionIds[sessionId];
    });

    ws.on('message', function message(data) {
        let obj = JSON.parse(data);
        console.log('req', obj);

        if (obj.type === "request_cmd") {
            sobj.requestUID = obj.uid;
            sobj.executor.send(JSON.stringify({
                "type": "requested_cmd",
                "payload": obj.payload
            }));
        }
    });

    ws.send(JSON.stringify({
        "type": "welcome",
        "sessionId": sessionId
    }));
}

function processExecutor(ws, sessionId) {
    if (!sessionIds.hasOwnProperty(sessionId)) {
        ws.close(4052, "No such session ID.");
        return;
    }

    let sobj = sessionIds[sessionId];

    if (sobj.executor) {
        sobj.executor.close(4054, "Connection replaced.");
    }

    sobj.executor = ws;
    sobj.requestor.send(JSON.stringify({"type": "executor_connected"}));

    ws.on('error', console.error);

    ws.on('message', function message(data) {
        let obj = JSON.parse(data);
        console.log('exec', obj);

        if (obj.type === "executed_cmd") {
            if (sobj.requestUID !== null) {
                sobj.requestor.send(JSON.stringify({
                    "type": "result_cmd",
                    "payload": obj.payload,
                    "uid": sobj.requestUID
                }));
                sobj.requestUID = null;
            }
        }
    });

    ws.send(JSON.stringify({"type": "ping"}));
}

function createServer(args) {
    const app = express();
    const server = app.listen(args.listenPort, args.listenHost);

    let wss = new WebSocketServer({
        noServer: true,
        maxPayload: 6 * 1024 // max packet size - 6 kB
    });

    app.use(express.urlencoded({extended: false}));
    app.use('/assets/static', express.static(dirname + '/assets/static'));

    nunjucks.configure(dirname + '/assets/views', {
        autoescape: true,
        express: app
    });

    app.get('/', (req, res) => {
        res.render('gateway_index.html');
    });

    server.on('upgrade', (request, socket, head) => {
        wss.handleUpgrade(request, socket, head, socket => {
            wss.emit('connection', socket, request);
        });
    });

    wss.on('connection', (ws, req) => {
        let query = req.url.split('?', 2)[1];
        let qs = queryString.parse(query);

        if (qs.side === "requestor") {
            processRequestor(ws);
        } else if (qs.side === "executor") {
            processExecutor(ws, qs.sessionId);
        } else {
            ws.close(4050, "Invalid query string parameters specified.");
        }
    });
}

createServer(args);
