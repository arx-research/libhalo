const crypto = require('crypto').webcrypto;
const {randomBuffer} = require("../halo/util");

let dirname;

if (process.pkg && process.pkg.entrypoint) {
    dirname = __dirname;
} else {
    dirname = '.';
}

module.exports = {dirname, randomBuffer};
