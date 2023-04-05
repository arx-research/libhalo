const crypto = require("crypto").webcrypto;
const jose = require("jose");

class JWEUtil {
    constructor() {

    }

    async generateKey() {
        let sharedKey = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('hex');
        this.sharedKeyObj = await crypto.subtle.importKey("raw", sharedKey, "AES-GCM", true, [
            "encrypt",
            "decrypt",
        ]);
        return sharedKey;
    }

    async loadKey(sharedKey) {
        this.sharedKeyObj = await crypto.subtle.importKey("raw", sharedKey, "AES-GCM", true, [
            "encrypt",
            "decrypt",
        ]);
    }

    async encrypt(data) {
        return await new jose.CompactEncrypt(
            new TextEncoder().encode(JSON.stringify(data)))
            .setProtectedHeader({alg: 'dir', enc: 'A256GCM'})
            .encrypt(this.sharedKeyObj);
    }

    async decrypt(jwe) {
        const { plaintext, protectedHeader } = await jose.compactDecrypt(jwe, this.sharedKeyObj);
        // TODO check protectedHeader
        return JSON.parse(plaintext);
    }
}

module.exports = {JWEUtil};
