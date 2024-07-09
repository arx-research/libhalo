/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

import {webcrypto as crypto} from 'crypto';
import express from "express";
import {WebSocketServer} from 'ws';
import queryString from 'query-string';
import nunjucks from "nunjucks";
import {parse} from "url";

import {parseArgs} from './args_gateway.js';
import {printVersionInfo, getBuildInfo} from "./version.js";
import {dirname} from "./util.js";

let buildInfo = getBuildInfo();

const REQUESTOR_SESS_LIMIT = 10 * 60 * 1000;
const MAX_SESSION_LIMIT = 1000;

let args = parseArgs();

if (!args) {
    process.exit(0);
}

let sessionIds = {};

function processRequestor(ws, req) {
    if (Object.keys(sessionIds).length >= MAX_SESSION_LIMIT) {
        ws.close(4053, "Too many connections.");
        return;
    }

    let sessionId = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64url');
    let ipStr = 'IP: ' + req.socket.remoteAddress;

    if (req.headers['x-forwarded-for']) {
        ipStr += ', Fwd: ' + req.headers['x-forwarded-for'];
    }

    console.log('[' + sessionId + '] Requestor connected. ' + ipStr);

    sessionIds[sessionId] = {
        "requestor": ws,
        "executor": null,
        "requestUID": null,
        "reconnects": 0
    };

    let sobj = sessionIds[sessionId];

    setTimeout(() => {
        ws.close(4080, "Session timed out.");
    }, REQUESTOR_SESS_LIMIT);

    ws.on('error', console.error);

    ws.on('close', function close() {
        if (sobj.executor) {
            sobj.executor.close(4051, "Requestor closed the connection.");
        }

        console.log('[' + sessionId + '] Disconnected both sides.');
        delete sessionIds[sessionId];
    });

    ws.on('message', function message(data) {
        let obj = JSON.parse(data);

        if (obj.type === "keepalive") {
            // ignore
            return;
        }

        if (obj.type === "request_cmd") {
            if (sobj.requestUID !== null) {
                sobj.requestor.close(4055, "Protocol error on requestor side.");
            } else if (sobj.executor) {
                sobj.requestUID = obj.uid;
                sobj.executor.send(JSON.stringify({
                    "type": "requested_cmd",
                    "payload": obj.payload
                }));
                console.log('[' + sessionId + '] Command request sent to executor.');
            } else {
                sobj.requestor.send(JSON.stringify({
                    "uid": obj.uid,
                    "type": "no_executor"
                }));
            }
        }
    });

    ws.send(JSON.stringify({
        "type": "welcome",
        "sessionId": sessionId,
        "serverVersion": buildInfo
    }));
}

function processExecutor(ws, req, sessionId) {
    if (!sessionIds.hasOwnProperty(sessionId)) {
        ws.close(4052, "No such session ID.");
        return;
    }

    let sobj = sessionIds[sessionId];
    let ipStr = 'IP: ' + req.socket.remoteAddress;

    if (req.headers['x-forwarded-for']) {
        ipStr += ', Fwd: ' + req.headers['x-forwarded-for'];
    }

    if (sobj.executor) {
        sobj.executor.close(4054, "Connection replaced.");
        console.log('[' + sessionId + '] Executor reconnected. ' + ipStr);
    } else {
        console.log('[' + sessionId + '] Executor connected.' + ipStr);
    }

    if (sobj.reconnects > 5) {
        sobj.requestor.close(4055, "Protocol error on executor side: Too many reconnections.");
        ws.close(4062, "Too many reconnections.");
        return;
    }

    sobj.reconnects++;
    sobj.executor = ws;
    sobj.requestUID = null;
    sobj.requestor.send(JSON.stringify({"type": "executor_connected"}));

    ws.on('error', console.error);

    ws.on('close', () => {
        sobj.requestor.send(JSON.stringify({"type": "executor_disconnected"}));
    });

    ws.on('message', (data) => {
        let obj = JSON.parse(data);

        if (obj.type === "keepalive") {
            // ignore
            return;
        }

        if (obj.type === "executed_cmd") {
            if (sobj.requestUID !== null) {
                sobj.requestor.send(JSON.stringify({
                    "type": "result_cmd",
                    "payload": obj.payload,
                    "uid": sobj.requestUID
                }));
                sobj.requestUID = null;
                console.log('[' + sessionId + '] Command result sent to requestor.');
            }
        } else {
            sobj.requestor.close(4057, "Protocol error on executor side: Invalid message.");
            ws.close(4067, "Invalid message.");
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

    app.get('/health', (req, res) => {
        res.type('text/plain').send('OK');
    });

    app.get('/e', (req, res) => {
        res.render('gateway_executor.html');
    });

    app.get('/ws', (req, res) => {
        res.status(426).type('text/plain').send('Upgrade required');
    });

    server.on('upgrade', (request, socket, head) => {
        const { pathname } = parse(request.url);

        if (pathname === "/ws") {
            wss.handleUpgrade(request, socket, head, socket => {
                wss.emit('connection', socket, request);
            });
        } else {
            socket.destroy();
        }
    });

    wss.on('connection', (ws, req) => {
        try {
            let query = req.url.split('?', 2)[1];
            let qs = queryString.parse(query);

            if (qs.side === "requestor") {
                processRequestor(ws, req);
            } else if (qs.side === "executor") {
                processExecutor(ws, req, qs.sessionId);
            } else {
                ws.close(4050, "Invalid query string parameters specified.");
            }
        } catch (e) {
            console.error(e);
            ws.close(4061, "Unhandled exception.");
        }
    });

    console.log('HaLo Gateway server is listening...');
}

printVersionInfo();
createServer(args);
