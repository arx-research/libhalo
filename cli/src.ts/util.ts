import { fileURLToPath } from 'node:url';
import { dirname as path_dirname, join as path_join } from 'node:path';
import crypto from "crypto";
import fs from "fs";

function randomBuffer() {
    return Buffer.from(crypto.getRandomValues(new Uint8Array(32)));
}

function saveLog(log: Record<string, string | string[]>) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const filename = `${year}_${month}.ndjson`;
    const logDir = path_join(dirname, "logs");
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

let dirname: string;

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
if (process.pkg && process.pkg.entrypoint) {
    dirname = __dirname;
} else {
    const filename = fileURLToPath(import.meta.url);
    dirname = path_join(path_dirname(filename), '..');
    console.log(dirname);
}

export {dirname, randomBuffer, saveLog};
