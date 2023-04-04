const crypto = require('crypto').webcrypto;

let dirname;

if (process.pkg && process.pkg.entrypoint) {
    dirname = __dirname;
} else {
    dirname = '.';
}

function randomBuffer() {
    return Buffer.from(crypto.getRandomValues(new Uint8Array(32)));
}

module.exports = {dirname, randomBuffer};
