import express from 'express';
import nunjucks from "nunjucks";
import {WebSocket, WebSocketServer} from 'ws';
import jwt from 'jsonwebtoken';
import https from "https";
import fs from "fs";
import path from "path";
import os from "os";
import util from "util";
import {Duplex} from "stream";

import {dirname, randomBuffer, redactLogObject, safeWsMessageHandler} from "./util.js";
import {getBuildInfo} from "./version.js";

import {execHaloCmdPCSC} from "@arx-research/libhalo/api/desktop";
import {NFCOperationError} from "@arx-research/libhalo/api/common";
import {Reader} from "@arx-research/libhalo/types";
import {Namespace} from "argparse";

let wss: WebSocketServer | null = null;

let currentWsClient: WebSocket | null = null;
let currentState: {
    handle: string
    reader: Reader
} | null = null;

const jwtSigningKey = randomBuffer().toString('hex');
const userConsentOrigins = new Set();

const buildInfo = getBuildInfo();

function generateHandle() {
    return randomBuffer().toString('base64');
}

// CSRF tokens are bound to the website origin that is being authorized and can only be used once
const usedCSRFTokenIds = new Map<string, number>();

function websiteToOrigin(website: unknown): string | null {
    if (typeof website !== "string") {
        return null;
    }

    try {
        const url = new URL(website);
        return url.protocol + '//' + url.host;
    } catch (e) {
        return null;
    }
}

async function makeCSRFToken(websiteOrigin: string) {
    return new Promise((resolve, reject) => {
        jwt.sign({
            purpose: 'csrf-consent',
            website: websiteOrigin,
            jti: randomBuffer().toString('hex')
        }, jwtSigningKey, {expiresIn: 120}, (err, token) => {
            if (err) {
                reject(err);
            } else {
                resolve(token);
            }
        });
    });
}

async function validateCSRFToken(token: unknown, websiteOrigin: string) {
    if (typeof token !== "string") {
        throw new Error('Missing CSRF token.');
    }

    const decoded = await new Promise<Record<string, unknown>>((resolve, reject) => {
        jwt.verify(token, jwtSigningKey, (err, decoded) => {
            if (err) {
                reject(err);
            } else {
                resolve(<Record<string, unknown>> decoded);
            }
        });
    });

    if (decoded.purpose !== 'csrf-consent') {
        throw new Error('Incorrect token purpose.');
    }

    if (decoded.website !== websiteOrigin) {
        throw new Error('Token was issued for a different website.');
    }

    if (typeof decoded.jti !== "string" || typeof decoded.exp !== "number") {
        throw new Error('Malformed token.');
    }

    const now = Math.floor(Date.now() / 1000);

    for (const [jti, exp] of usedCSRFTokenIds) {
        if (exp < now) {
            usedCSRFTokenIds.delete(jti);
        }
    }

    if (usedCSRFTokenIds.has(decoded.jti)) {
        throw new Error('Token was already used.');
    }

    usedCSRFTokenIds.set(decoded.jti, decoded.exp);
    return decoded;
}

function buildAllowedHosts(args: Namespace) {
    // Only accept requests that are addressed to the bridge itself. This prevents DNS rebinding attacks,
    // where an attacker-controlled domain is re-pointed to 127.0.0.1 in order to reach the bridge
    // as a same-origin website.
    const hostnames = new Set(['127.0.0.1', 'localhost', '[::1]', 'halo-bridge.localhost', 'halo-bridge.local']);
    const listenHost = String(args.listenHost ?? '').toLowerCase();

    if (listenHost && listenHost !== '0.0.0.0' && listenHost !== '::' && listenHost !== '[::]') {
        hostnames.add(listenHost.includes(':') && !listenHost.startsWith('[') ? '[' + listenHost + ']' : listenHost);
    }

    const allowedHosts = new Set<string>();

    for (const hostname of hostnames) {
        for (const port of [args.listenPort, args.listenPortTLS]) {
            allowedHosts.add(hostname + ':' + port);

            if (port === 80 || port === 443) {
                allowedHosts.add(hostname);
            }
        }
    }

    return allowedHosts;
}

function sendToCurrentWs(ws: WebSocket | null, data: unknown) {
    console.log('send', util.inspect(data, {showHidden: false, depth: null, colors: true}));

    if (currentWsClient !== null && (ws === null || currentWsClient === ws)) {
        currentWsClient.send(JSON.stringify(data));
        return true;
    }

    return false;
}

function wsEventCardConnected(reader: Reader) {
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

    const handle = generateHandle();
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

function wsEventCardIncompatible(reader: Reader) {
    sendToCurrentWs(null, {
        "event": "handle_not_compatible",
        "uid": null,
        "data": {
            "reader_name": reader.reader.name,
            "message": "Denying access to the resource since it's not a HaLo tag."
        }
    });
}

function wsEventCardDisconnected(reader: Reader) {
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

function wsEventReaderConnected(reader: Reader) {
    sendToCurrentWs(null, {
        "event": "reader_added",
        "uid": null,
        "data": {
            "reader_name": reader.reader.name
        }
    });
}

function wsEventReaderDisconnected(reader: Reader) {
    sendToCurrentWs(null, {
        "event": "reader_removed",
        "uid": null,
        "data": {
            "reader_name": reader.reader.name
        }
    });
}

function readTLSData() {
    let certDirs: string[];

    if (process.platform === "win32") {
        certDirs = [path.join(os.homedir(), ".halo-bridge")];
    } else if (process.platform === "darwin") {
        certDirs = ['/Library/Application Support/HaLo Bridge'];
    } else {
        certDirs = ['/usr/local/etc/halo-bridge'];
    }

    for (const certDir of certDirs) {
        const privateKeyPath = path.join(certDir, "private_key.pem");
        const certificatePath = path.join(certDir, "server.crt");

        if (fs.existsSync(privateKeyPath) && fs.existsSync(certificatePath)) {
            const privateKey = fs.readFileSync(privateKeyPath);
            const certificate = fs.readFileSync(certificatePath);

            return {privateKey, certificate};
        }
    }

    return null;
}

function wsCreateServer(args: Namespace, getReaderNames: () => string[]) {
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
    const allowedHosts = buildAllowedHosts(args);

    const isHostAllowed = (host: string | undefined) => {
        return typeof host === "string" && allowedHosts.has(host.toLowerCase());
    };

    app.use((req, res, next) => {
        if (!isHostAllowed(req.headers.host)) {
            res.status(403).type('text/plain').send('Invalid Host header.');
            return;
        }

        next();
    });

    // origins that are allowed to connect without asking the user for consent:
    // * the bridge's own pages (served over HTTP/WS and HTTPS/WSS ports)
    // * the trusted remote websites, over HTTPS only
    const builtInAllowedOrigins = new Set<string>([
        "https://burner.pro",
        "https://boot.burner.pro",
        "https://os.burner.pro"
    ]);

    for (const hostname of ["127.0.0.1", "localhost", "[::1]", "halo-bridge.localhost", "halo-bridge.local"]) {
        builtInAllowedOrigins.add(new URL("http://" + hostname + ":" + args.listenPort).origin);
        builtInAllowedOrigins.add(new URL("https://" + hostname + ":" + args.listenPortTLS).origin);
    }

    // inflate: false rejects compressed request bodies (HTTP 415) so untrusted input never reaches
    // the embedded Node.js Brotli decoder (CVE-2026-111497). The halo-tools binaries currently embed
    // Node.js v24.20.0 via @yao-pkg/pkg-fetch; waiting for yao-pkg to publish a release with patched
    // Node.js v24.22.1. Compressed request bodies are not needed here, so this can stay afterwards.
    app.use(express.urlencoded({extended: false, inflate: false}));

    app.use((req, res, next) => {
        res.set('Content-Security-Policy', "frame-ancestors 'none'");
        res.set('X-Frame-Options', 'DENY');
        next();
    });

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
        let url;

        try {
            url = new URL(req.query.website as string);
        } catch (e) {
            res.status(400).send('Bad request.');
            return;
        }

        const csrfToken = await makeCSRFToken(url.protocol + '//' + url.host);

        res.render('consent.html', {
            csrfToken,
            website: url.href
        });
    });

    app.post('/consent/post', async (req, res) => {
        const websiteOrigin = websiteToOrigin(req.body.website);

        if (!websiteOrigin) {
            res.status(400).send('Bad request.');
            return;
        }

        try {
            await validateCSRFToken(req.body.csrf_token, websiteOrigin);
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

        userConsentOrigins.add(websiteOrigin);

        res.render('consent_close.html');
    });

    const rejectUpgrade = (socket: Duplex) => {
        socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
        socket.destroy();
    };

    server.on('upgrade', (request, socket, head) => {
        if (!isHostAllowed(request.headers.host)) {
            rejectUpgrade(socket);
            return;
        }

        wss && wss.handleUpgrade(request, socket, head, socket => {
            wss && wss.emit('connection', socket, request);
        });
    });

    if (serverTLS) {
        serverTLS.on('upgrade', (request, socket, head) => {
            if (!isHostAllowed(request.headers.host)) {
                rejectUpgrade(socket);
                return;
            }

            wss && wss.handleUpgrade(request, socket, head, socket => {
                wss && wss.emit('connection', socket, request);
            });
        });
    }

    wss.on('connection', (ws, req) => {
        const parts = req.url!.split('?');

        if (parts.length === 2 && parts[1] === "ping=1") {
            ws.close(4090, "Pong.");
            return;
        }

        let permitted = false;
        let normalizedOrigin = "(none)";

        if (typeof req.headers.origin !== "undefined" || args.requireOrigin) {
            try {
                normalizedOrigin = new URL(req.headers.origin!).origin;
            } catch (e) {
                ws.close(4003, "Failed to parse origin URL.");
                return;
            }
        }

        if (args.allowOrigins) {
            const allowedOrigins = args.allowOrigins.split(';');

            if (allowedOrigins.includes(req.headers.origin)) {
                permitted = true;
            }
        }

        if (userConsentOrigins.has(req.headers.origin)) {
            permitted = true;
        }

        // compare full origins (scheme + host + port), not just hostnames,
        // otherwise plain-HTTP or other-port variants of these names would be trusted too
        if (normalizedOrigin === "(none)" || builtInAllowedOrigins.has(normalizedOrigin)) {
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

        ws.on('message', safeWsMessageHandler(ws, '[bridge]', async (packet) => {
            if (currentWsClient !== ws) {
                return;
            }

            const packetToPrint = redactLogObject(packet);
            console.log('recv', util.inspect(packetToPrint, {showHidden: false, depth: null, colors: true}));

            if (packet.type === "exec_halo") {
                try {
                    if (!currentState || packet.handle !== currentState.handle) {
                        throw new NFCOperationError("Invalid handle.");
                    }

                    const res = await execHaloCmdPCSC(packet.command, currentState.reader);
                    sendToCurrentWs(ws, {
                        "event": "exec_success",
                        "uid": packet.uid,
                        "data": {
                            "res": res
                        }
                    });
                } catch (err) {
                    const e = err as Error;
                    sendToCurrentWs(ws, {
                        "event": "exec_exception",
                        "uid": packet.uid,
                        "data": {
                            "exception": {
                                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                // @ts-expect-error
                                "kind": e.errorName ?? e.constructor.name,
                                "name": e.name,
                                "message": e.message,
                                "stack": e.stack
                            }
                        }
                    });
                }
            }
        }));

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

        const readerNames = getReaderNames();

        for (const readerName of readerNames) {
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
