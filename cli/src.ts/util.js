import { fileURLToPath } from 'node:url';
import { dirname as path_dirname } from 'node:path';
import crypto from "crypto";

function randomBuffer() {
    return Buffer.from(crypto.getRandomValues(new Uint8Array(32)));
}

let dirname;

if (process.pkg && process.pkg.entrypoint) {
    dirname = __dirname;
} else {
    const filename = fileURLToPath(import.meta.url);
    dirname = path_dirname(filename);
}

export {dirname, randomBuffer};
