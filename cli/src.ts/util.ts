import { fileURLToPath } from 'node:url';
import { dirname as path_dirname, join as path_join } from 'node:path';
import crypto from "crypto";

function randomBuffer() {
    return Buffer.from(crypto.getRandomValues(new Uint8Array(32)));
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

export {dirname, randomBuffer};
