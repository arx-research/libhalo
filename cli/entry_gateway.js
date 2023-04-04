/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

const crypto = require('crypto');
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
        "executor": null
    };

    ws.on('error', console.error);

    ws.on('close', function close() {
        let sobj = sessionIds[sessionId];

        if (sobj.executor) {
            sobj.executor.close(4051, "Requestor closed the connection.");
        }

        console.log('Deleting ' + sessionId);
        delete sessionIds[sessionId];
    });

    ws.on('message', function message(data) {
        console.log(data);
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
        console.log(data);
    });

    ws.send(JSON.stringify({"type": "ping"}));
}

function createServer(args) {
    const app = express();
    const server = app.listen(args.listenPort, args.listenHost);

    let wss = new WebSocketServer({noServer: true});

    app.use(express.urlencoded({extended: false}));
    app.use('/assets/static', express.static(dirname + '/assets/static'));

    nunjucks.configure(dirname + '/assets/views', {
        autoescape: true,
        express: app
    });

    app.get('/', (req, res) => {
        res.render('gateway_index.html');
    });

    // TODO remove this
    app.get('/_requestor', (req, res) => {
        res.render('gateway_requestor.html');
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
