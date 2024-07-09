import { fileURLToPath } from 'node:url';
import { dirname as path_dirname } from 'node:path';

import {randomBuffer} from "../halo/util.js";

let dirname;

if (process.pkg && process.pkg.entrypoint) {
    dirname = __dirname;
} else {
    const filename = fileURLToPath(import.meta.url);
    dirname = path_dirname(filename);
}

export {dirname, randomBuffer};
