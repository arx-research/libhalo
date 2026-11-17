import {fileURLToPath} from 'node:url';
import {dirname as path_dirname, join as path_join} from 'node:path';
import crypto from "crypto";
import fs from "fs";
import path from "path";
import os from "os";
import {RawData, WebSocket} from "ws";

function randomBuffer() {
    return Buffer.from(crypto.getRandomValues(new Uint8Array(32)));
}

function redactLogObject(originalObject: Record<string, unknown>) {
    // ensure deep copy
    const obj = JSON.parse(JSON.stringify(originalObject));

    if (Object.prototype.hasOwnProperty.call(obj, "command")) {
        const cmdObj = obj["command"] as Record<string, unknown>;

        for (const key of Object.keys(cmdObj)) {
            if (key.toLowerCase().includes("password")) {
                obj["command"][key] = "<< REDACTED >>"
            }
        }
    }

    return obj
}

function saveLog(log: Record<string, string | string[]>) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const filename = `${year}_${month}.ndjson`;
    const logDir = "./logs/";
    const logPath = path_join(logDir, filename);

    const alteredLog = {
        iso_timestamp: (new Date).toISOString(),
        timestamp: String(Date.now()),
        ...log,
    }

    // Create log directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir);
    }

    // Create/append to log file
    fs.appendFile(logPath, JSON.stringify(alteredLog) + "\n", (err) => {
        if (err) {
            console.log("saveLog() failed: ", err);
        }
    });
}

function getSimConfigPath() {
    return path.join(os.homedir(), '.halo-simulator.json');
}

function simConfigExists() {
    return fs.existsSync(getSimConfigPath());
}

function getSimConfig() {
    return JSON.parse(fs.readFileSync(getSimConfigPath(), 'utf-8'));
}

function saveSimConfig(simConfig: unknown) {
    fs.writeFileSync(getSimConfigPath(), JSON.stringify(simConfig, null, 4));
}

let dirname: string;

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
if (process.pkg && process.pkg.entrypoint) {
    dirname = __dirname;
} else {
    const filename = fileURLToPath(import.meta.url);
    dirname = path_join(path_dirname(filename), '..');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WsPacket = Record<string, any>;

/**
 * Wrap a WebSocket "message" listener so that malformed packets or exceptions thrown by the handler
 * only close the offending connection. An exception escaping a "message" listener would otherwise
 * become an uncaught exception and terminate the whole process.
 */
function safeWsMessageHandler(ws: WebSocket, logPrefix: string, handler: (packet: WsPacket) => unknown) {
    return async (data: RawData) => {
        let packet: unknown;

        try {
            packet = JSON.parse(data.toString('utf-8'));
        } catch (e) {
            packet = null;
        }

        if (typeof packet !== "object" || packet === null || Array.isArray(packet)) {
            console.log(logPrefix + ' Received malformed packet, closing the connection.');
            ws.close(4060, "Malformed packet.");
            return;
        }

        try {
            await handler(packet as WsPacket);
        } catch (e) {
            console.error(logPrefix + ' Unhandled exception when processing packet.', e);
            ws.close(4061, "Unhandled exception.");
        }
    };
}

export {
    dirname,
    randomBuffer,
    saveLog,
    getSimConfigPath,
    simConfigExists,
    getSimConfig,
    saveSimConfig,
    redactLogObject,
    safeWsMessageHandler
};
