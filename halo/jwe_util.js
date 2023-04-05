const Buffer = require('buffer/').Buffer;
const crypto = require('crypto');
const {hex2arr} = require("./utils");
const { subtle } = globalThis.crypto;
const jose = require('jose');

class JWEUtil {
    constructor() {

    }

    async generateKey() {
        console.log('call c');
        let sharedKey = crypto.randomBytes(16).toString('base64url');
        console.log('call c2');
        this.sharedKeyObj = await subtle.importKey("raw", hex2arr(sharedKey), "AES-GCM", true, [
            "encrypt",
            "decrypt",
        ]);
        return sharedKey;
    }

    async loadKey(sharedKey) {
        let sharedKeyBuf = Buffer.from(sharedKey, 'base64url');
        this.sharedKeyObj = await subtle.importKey("raw", sharedKeyBuf, "AES-GCM", true, [
            "encrypt",
            "decrypt",
        ]);
    }

    async encrypt(data) {
        return await new jose.CompactEncrypt(
            new TextEncoder().encode(JSON.stringify(data)))
            .setProtectedHeader({alg: 'dir', enc: 'A128GCM'})
            .encrypt(this.sharedKeyObj);
    }

    async decrypt(jwe) {
        const { plaintext, protectedHeader } = await jose.compactDecrypt(jwe, this.sharedKeyObj);

        if (protectedHeader.alg !== "dir" || protectedHeader.enc !== "A128GCM") {
            throw new Error("Unsupported type of JWE.");
        }

        console.log('decrypted', plaintext);
        return JSON.parse(Buffer.from(plaintext).toString());
    }
}

module.exports = {JWEUtil};
