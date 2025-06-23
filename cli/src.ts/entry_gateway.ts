/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

import {webcrypto as crypto} from 'crypto';
import express from "express";
import {RawData, WebSocket, WebSocketServer} from 'ws';
import {IncomingMessage} from "http";
import queryString from 'query-string';
import nunjucks from "nunjucks";
import {parse} from "url";
import {join as path_join} from 'node:path';
import fs from "fs";

import {parseArgs} from './args_gateway.js';
import {printVersionInfo, getBuildInfo} from "./version.js";
import {dirname, saveLog} from "./util.js";
import {Namespace} from "argparse";

const buildInfo = getBuildInfo();

const REQUESTOR_SESS_LIMIT = 10 * 60 * 1000;
const MAX_SESSION_LIMIT = 1000;

const args = parseArgs();

if (!args) {
    process.exit(0);
}

interface SocketState {
    requestor: WebSocket,
    executor: WebSocket | null
    requestUID: null
    reconnects: number
    themeName: string
}

const cachedFiles: Record<string, string> = {};
const sessionIds: Record<string, SocketState> = {};
let cachedStatsObj: unknown | null = null;
let cachedStatsTimestamp: number = +new Date();

function loadCachedFile(path: string) {
    if (Object.prototype.hasOwnProperty.call(cachedFiles, path)) {
        return cachedFiles[path];
    }

    const data = fs.readFileSync(path, {encoding: "utf-8"});
    cachedFiles[path] = data;
    return data;
}

function processRequestor(ws: WebSocket, req: IncomingMessage) {
    if (Object.keys(sessionIds).length >= MAX_SESSION_LIMIT) {
        ws.close(4053, "Too many connections.");
        return;
    }

    const sessionId = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64url');
    let ipStr = 'IP: ' + req.socket.remoteAddress;

    if (req.headers['x-forwarded-for']) {
        ipStr += ', Fwd: ' + req.headers['x-forwarded-for'];
    }

    console.log('[' + sessionId + '] Requestor connected. ' + ipStr);

    const log_to_save = {
        event_name: "Requestor connected",
        origin: req.headers['origin'] || "Unknown",
        forwarded_for: req.headers['x-forwarded-for'] || "Unknown",
        ip: req.socket.remoteAddress || "Unknown",
    };
    saveLog(log_to_save);

    sessionIds[sessionId] = {
        "requestor": ws,
        "executor": null,
        "requestUID": null,
        "reconnects": 0,
        "themeName": "default",
    };

    const sobj = sessionIds[sessionId];

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
        const obj = JSON.parse(data.toString('utf-8'));

        if (obj.type === "keepalive") {
            // ignore
            return;
        }

        if (obj.type === "set_theme") {
            if (typeof obj.themeName !== "string" || obj.themeName.length < 3 || !(/^([a-z0-9_]+)$/.test(obj.themeName))) {
                console.log('[' + sessionId + '] Received invalid set_theme packet. Theme name must be at least 3 characters long, and may only contain the following: a-z, 0-9 and _.');
                sobj.requestor.close(4055, "Protocol error on requestor side.");
                return;
            }

            console.log('[' + sessionId + '] Set theme: ' + obj.themeName);
            sobj.themeName = obj.themeName;
            sobj.requestor.send(JSON.stringify({
                "type": "set_theme_ack",
                "uid": obj.uid
            }));
        } else if (obj.type === "request_cmd") {
            if (sobj.requestUID !== null) {
                sobj.requestor.close(4055, "Protocol error on requestor side.");
            } else if (sobj.executor) {
                sobj.requestUID = obj.uid;
                sobj.executor.send(JSON.stringify({
                    "type": "requested_cmd",
                    "payload": obj.payload
                }));
                console.log('[' + sessionId + '] Command request sent to executor.');
                const log_to_save = {
                    event_name: "Command request sent to executor",
                    origin: req.headers['origin'] || "Unknown",
                    forwarded_for: req.headers['x-forwarded-for'] || "Unknown",
                    ip: req.socket.remoteAddress || "Unknown",
                };
                saveLog(log_to_save);
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

function processExecutor(ws: WebSocket, req: IncomingMessage, sessionId: string) {
    if (!Object.prototype.hasOwnProperty.call(sessionIds, sessionId)) {
        ws.close(4052, "No such session ID.");
        return;
    }

    const sobj = sessionIds[sessionId];
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

    ws.on('message', (data: RawData) => {
        const obj = JSON.parse(data.toString('utf-8'));

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

function generateStatsData() {
    const logDir = "./logs/";
    const logs: Record<string, Array<Record<string, string>>> = {};

    if (fs.existsSync(logDir)) {
        const logFilenames = fs.readdirSync(logDir);

        // Extract raw log data from all log files
        for (const filename of logFilenames) {
            const rawLogs = fs.readFileSync(path_join(logDir, filename), "utf-8");
            // Parse each line of the log file into a JSON object, ignore empty lines
            const parsedLogs = rawLogs
                .split("\n")
                .filter((line) => line.length > 0)
                .map((line) => JSON.parse(line));
            logs[filename.replaceAll(".ndjson", "")] = parsedLogs;
        }
    }

    // Prepare the data to be rendered
    // Format with example data:
    // {
    //   "2024_9": {
    //     "https://halo-demos.arx.org": {
    //        total_connections: 0,
    //        total_processed_commands: 0,
    //        total_unique_ips: 0
    //      },
    //      ...
    // }
    const data: Record<
        string,
        Record<
            string,
            {
                total_connections: number;
                total_processed_commands: number;
                total_unique_ips: number;
            }
        >
    > = {};
    for (const [yyyy_mm, logData] of Object.entries(logs)) {
        const uniqueIps: Record<string, Set<string>> = {}
        const length = Object.entries(logData).length;
        for (const [index, log] of logData.entries()) {
            const origin = log.origin;

            // Add initial records if they don't exist already
            if (!data[yyyy_mm]) {
                data[yyyy_mm] = {};
            }
            if (!data[yyyy_mm][origin]) {
                data[yyyy_mm][origin] = {
                    total_connections: 0,
                    total_processed_commands: 0,
                    total_unique_ips: 0,
                };
            }

            // Add IP to the set
            if (!uniqueIps[origin]) {
                uniqueIps[origin] = new Set();
            }
            uniqueIps[origin].add(log.ip);

            // Handle different log events
            if (log.event_name === "Requestor connected") {
                data[yyyy_mm][origin].total_connections++;
            } else if (log.event_name === "Command request sent to executor") {
                data[yyyy_mm][origin].total_processed_commands++;
            }

            // Update the total unique IPs
            data[yyyy_mm][origin].total_unique_ips = uniqueIps[origin].size;
        }
    }

    // Flatten the data to be rendered
    const flatData: Array<{
        year: number;
        month: number;
        origin: string;
        total_connections: number;
        total_processed_commands: number;
        total_unique_ips: number;
    }> = [];
    for (const [yyyy_mm, origins] of Object.entries(data)) {
        for (const [origin, stats] of Object.entries(origins)) {
            const [yyyy, mm] = yyyy_mm.split("_");
            flatData.push({
                year: parseInt(yyyy),
                month: parseInt(mm),
                origin: origin,
                total_connections: stats.total_connections,
                total_processed_commands: stats.total_processed_commands,
                total_unique_ips: stats.total_unique_ips,
            });
        }
    }

    // Sort the flat data by year and month(descending)
    flatData.sort((a, b) => {
        if (a.year === b.year) {
            return b.month - a.month;
        }
        return b.year - a.year;
    });

    return flatData;
}

function createServer(args: Namespace) {
    const app = express();
    const server = app.listen(args.listenPort, args.listenHost);

    const wss = new WebSocketServer({
        noServer: true,
        maxPayload: 6 * 1024 // max packet size - 6 kB
    });

    app.use(express.urlencoded({extended: false}));
    app.use('/assets/static', express.static(dirname + '/assets/static'));
    app.use('/themes', express.static('themes'))

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
        const sessionId = req.query.id;

        if (!sessionId || typeof sessionId !== 'string') {
            res.status(400).type('text/plain').send('Missing session ID.');
            return;
        }

        const sobj = sessionIds[sessionId]

        if (!sobj) {
            res.status(400).type('text/plain').send('Invalid session ID.');
            return;
        }

        if (sobj.themeName === 'default') {
            res.render('gateway_index.html');
        } else {
            let data;

            try {
                const filePath = path_join('themes', sobj.themeName, 'gateway_executor.html');

                if (!args.disableCache) {
                    data = loadCachedFile(filePath);
                } else {
                    data = fs.readFileSync(filePath, { encoding: 'utf-8' });
                }
            } catch (e) {
                res.status(400).type('text/plain').send('Invalid theme name.');
                return;
            }

            res.send(data);
        }
    });

    app.get('/ws', (req, res) => {
        res.status(426).type('text/plain').send('Upgrade required');
    });

    if (!args.disableStats) {
        app.get("/stats", (req, res) => {
            const currentTs = +new Date();
            let flatData

            if (cachedStatsObj && currentTs - cachedStatsTimestamp <= 1000 * 60) {
                flatData = cachedStatsObj
            } else {
                flatData = generateStatsData()
                cachedStatsObj = flatData
                cachedStatsTimestamp = +new Date()
            }

            res.render("stats.html", {data: flatData});
        });
    }

    server.on('upgrade', (request, socket, head) => {
        const { pathname } = parse(request.url!);

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
            const query = req.url!.split('?', 2)[1];
            const qs = queryString.parse(query);

            if (qs.side === "requestor") {
                processRequestor(ws, req);
            } else if (qs.side === "executor") {
                processExecutor(ws, req, qs.sessionId as string);
            } else {
                ws.close(4050, "Invalid query string parameters specified.");
            }
        } catch (e) {
            console.error(e);
            ws.close(4061, "Unhandled exception.");
        }
    });

    console.log('HaLo Gateway server is listening on ' + args.listenHost + ':' + args.listenPort);
}

printVersionInfo();
createServer(args);
