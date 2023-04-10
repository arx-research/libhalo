const Buffer = require('buffer/').Buffer;
const crypto = require('crypto');
const subtle = crypto.subtle ? crypto.subtle : globalThis.crypto.subtle;
const jose = require('jose');

class JWEUtil {
    constructor() {

    }

    async generateKey() {
        let sharedKey = crypto.randomBytes(16)
        let sharedKeyEnc = sharedKey.toString('base64').replace('+', '-').replace('/', '_');
        this.sharedKeyObj = await subtle.importKey("raw", sharedKey, "AES-GCM", true, [
            "encrypt",
            "decrypt",
        ]);
        return sharedKeyEnc;
    }

    async loadKey(sharedKey) {
        let sharedKeyBuf = Buffer.from(sharedKey.replace('-', '+').replace('_', '/'), 'base64');
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
        const hdr = jose.decodeProtectedHeader(jwe);

        if (Object.keys(hdr).length !== 2 || hdr.alg !== "dir" || hdr.enc !== "A128GCM") {
            throw new Error("Unexpected type of JWE provided.");
        }

        const { plaintext, protectedHeader } = await jose.compactDecrypt(jwe, this.sharedKeyObj);
        return JSON.parse(new TextDecoder().decode(plaintext));
    }
}

module.exports = {JWEUtil};