import {randomBuffer} from "../halo/util.js";

let dirname;

if (process.pkg && process.pkg.entrypoint) {
    dirname = __dirname;
} else {
    dirname = '.';
}

export {dirname, randomBuffer};
