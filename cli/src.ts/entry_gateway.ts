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
}

const sessionIds: Record<string, SocketState> = {};

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
        "reconnects": 0
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

function createServer(args: Namespace) {
    const app = express();
    const server = app.listen(args.listenPort, args.listenHost);

    const wss = new WebSocketServer({
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

    if (!args.disableStats) {
        app.get("/stats", (req, res) => {
            const logDir = path_join(dirname, "logs");
            const logFilenames = fs.readdirSync(logDir);
            const logs: Record<string, Array<Record<string, string>>> = {};
    
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
                const uniqueIps = new Set<string>();
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
                    uniqueIps.add(log.ip);
    
                    // Handle different log events
                    if (log.event_name === "Requestor connected") {
                        data[yyyy_mm][origin].total_connections++;
                    } else if (log.event_name === "Command request sent to executor") {
                        data[yyyy_mm][origin].total_processed_commands++;
                    }
    
                    // Update the total unique IPs if it's the last log entry
                    if (index === length - 1) {
                        data[yyyy_mm][origin].total_unique_ips = uniqueIps.size;
                    }
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

    console.log('HaLo Gateway server is listening...');
}

printVersionInfo();
createServer(args);
