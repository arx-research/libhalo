import express from 'express';
import nunjucks from "nunjucks";
import {WebSocketServer} from 'ws';
import {webcrypto as crypto} from 'crypto';
import {dirname, randomBuffer} from "./util.js";
import jwt from 'jsonwebtoken';
import https from "https";
import fs from "fs";
import path from "path";
import os from "os";
import util from "util";
import {execHaloCmdPCSC} from "../api/desktop.js";
import {getBuildInfo} from "./version.js";
import {NFCOperationError} from "../halo/exceptions.js";

let wss = null;

let currentWsClient = null;
let currentState = null;

let jwtSigningKey = randomBuffer().toString('hex');
let userConsentOrigins = new Set();

let buildInfo = getBuildInfo();

function generateHandle() {
    return randomBuffer().toString('base64');
}

async function makeCSRFToken() {
    return new Promise((resolve, reject) => {
        jwt.sign({purpose: 'csrf-consent'}, jwtSigningKey, {expiresIn: 120}, (err, token) => {
            if (err) {
                reject(err);
            } else {
                resolve(token);
            }
        });
    });
}

async function validateCSRFToken(token) {
    return new Promise((resolve, reject) => {
        jwt.verify(token, jwtSigningKey, (err, decoded) => {
            if (err) {
                reject(err);
            } else {
                if (decoded.purpose !== 'csrf-consent') {
                    reject(new Error('Incorrect token purpose.'));
                } else {
                    resolve(decoded);
                }
            }
        });
    });
}

function sendToCurrentWs(ws, data) {
    console.log('send', util.inspect(data, {showHidden: false, depth: null, colors: true}));

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

function wsEventCardIncompatible(reader) {
    sendToCurrentWs(null, {
        "event": "handle_not_compatible",
        "uid": null,
        "data": {
            "reader_name": reader.reader.name,
            "message": "Denying access to the resource since it's not a HaLo tag."
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

function readTLSData() {
    let privateKeyPath;
    let certificatePath;

    if (process.platform === "win32") {
        privateKeyPath = path.join(os.homedir(), ".halo-bridge\\private_key.pem");
        certificatePath = path.join(os.homedir(), ".halo-bridge\\server.crt");
    } else {
        privateKeyPath = '/usr/local/etc/halo-bridge/private_key.pem';
        certificatePath = '/usr/local/etc/halo-bridge/server.crt';
    }

    if (fs.existsSync(privateKeyPath) && fs.existsSync(certificatePath)) {
        const privateKey = fs.readFileSync(privateKeyPath);
        const certificate = fs.readFileSync(certificatePath);

        return {privateKey, certificate};
    }

    return null;
}

function wsCreateServer(args, getReaderNames) {
    const tlsData = readTLSData();
    let serverTLS = null;

    const app = express();
    const server = app.listen(args.listenPort, args.listenHost);

    let displayTLSWarn = (process.platform === "darwin");

    if (tlsData) {
        serverTLS = https.createServer({
            key: tlsData.privateKey,
            cert: tlsData.certificate
        }, app).listen(args.listenPortTLS, args.listenHost);

        displayTLSWarn = false;
    }

    wss = new WebSocketServer({noServer: true});

    app.use(express.urlencoded({extended: false}));
    app.use('/assets/static', express.static(dirname + '/assets/static'));

    nunjucks.configure(dirname + '/assets/views', {
        autoescape: true,
        express: app
    });

    app.get('/', (req, res) => {
        res.render('ws_client.html', {
            wsPort: args.listenPort,
            wssPort: args.listenPortTLS
        });
    });

    app.get('/health', (req, res) => {
        res.type('text/plain')
            .set('Access-Control-Allow-Origin', req.headers.origin)
            .set('Access-Control-Allow-Methods', 'GET')
            .send('OK');
    });

    app.get('/consent', async (req, res) => {
        let url = new URL(req.query.website);
        let csrfToken = await makeCSRFToken();

        res.render('consent.html', {
            csrfToken,
            website: url.href
        });
    });

    app.post('/consent/post', async (req, res) => {
        try {
            await validateCSRFToken(req.body.csrf_token);
        } catch (e) {
            res.render('consent_error.html', {
                errorMessage: 'Failed to check CSRF token. Please navigate back, refresh the page and try again.'
            });

            return;
        }

        if (req.body.submit !== "allow") {
            res.render('consent_error.html', {
                errorMessage: 'No consent was given to authorize the website. You can close this page.'
            });

            return;
        }

        let url = new URL(req.body.website);
        userConsentOrigins.add(url.protocol + '//' + url.host);

        res.render('consent_close.html');
    });

    server.on('upgrade', (request, socket, head) => {
        wss.handleUpgrade(request, socket, head, socket => {
            wss.emit('connection', socket, request);
        });
    });

    if (serverTLS) {
        serverTLS.on('upgrade', (request, socket, head) => {
            wss.handleUpgrade(request, socket, head, socket => {
                wss.emit('connection', socket, request);
            });
        });
    }

    wss.on('connection', (ws, req) => {
        let parts = req.url.split('?');

        if (parts.length === 2 && parts[1] === "ping=1") {
            ws.close(4090, "Pong.");
            return;
        }

        let permitted = false;
        let originHostname;

        try {
            originHostname = new URL(req.headers.origin).hostname;
        } catch (e) {
            ws.close(4003, "Failed to parse origin URL.");
            return;
        }

        if (args.allowOrigins) {
            let allowedOrigins = args.allowOrigins.split(';');

            if (allowedOrigins.includes(req.headers.origin)) {
                permitted = true;
            }
        }

        if (userConsentOrigins.has(req.headers.origin)) {
            permitted = true;
        }

        if (originHostname === "127.0.0.1" || originHostname === "localhost" || originHostname === "halo-bridge.internal") {
            permitted = true;
        }

        if (!permitted) {
            ws.close(4002, "Origin is not on the allow list and there was no user's consent.");
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
            console.log('recv', util.inspect(packet, {showHidden: false, depth: null, colors: true}));

            if (packet.type === "exec_halo") {
                try {
                    if (!currentState || packet.handle !== currentState.handle) {
                        throw new NFCOperationError("Invalid handle.");
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
                                "kind": e.constructor.name,
                                "name": e.name,
                                "message": e.message,
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
            "data": {
                "server_version": {
                    tag_name: buildInfo.tagName,
                    commit_id: buildInfo.commitId,
                    version: buildInfo.version
                }
            }
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

    const exitSignal = (process.platform === "win32" ? 'SIGINT' : 'SIGTERM');

    process.on(exitSignal, () => {
        if (currentWsClient) {
            currentWsClient.close(4070, "The server is shutting down.");
        }

        process.exit(0);
    });

    return {hasTLS: !!serverTLS};
}

export {
    wsCreateServer,
    wsEventCardConnected,
    wsEventCardIncompatible,
    wsEventCardDisconnected,
    wsEventReaderConnected,
    wsEventReaderDisconnected
};
