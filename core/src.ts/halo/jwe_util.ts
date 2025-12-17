import {Buffer} from 'buffer/index.js';
import crypto from 'crypto';
const subtle = crypto.webcrypto && crypto.webcrypto.subtle ? crypto.webcrypto.subtle : globalThis.crypto.subtle;
import {CompactEncrypt, decodeProtectedHeader, compactDecrypt} from 'jose';

class JWEUtil {
    private sharedKeyObj: CryptoKey | null;

    constructor() {
        this.sharedKeyObj = null;
    }

    async generateKey() {
        const sharedKey = crypto.randomBytes(16)
        const sharedKeyEnc = sharedKey
            .toString('base64')
            .replaceAll('+', '-')
            .replaceAll('/', '_')
            .replaceAll('==', '');

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        this.sharedKeyObj = await subtle.importKey("raw", sharedKey, "AES-GCM", true, [
            "encrypt",
            "decrypt",
        ]);

        return sharedKeyEnc;
    }

    async loadKey(sharedKey: string) {
        // automatically add "=" padding if it's not present
        let padLen = (-sharedKey.length % 3) + 3;

        if (padLen === 3) {
            padLen = 0;
        }

        const fixedKeyStr = (sharedKey + "=".repeat(padLen))
            .replaceAll('-', '+')
            .replaceAll('_', '/');
        const sharedKeyBuf = Buffer.from(fixedKeyStr, 'base64');
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        this.sharedKeyObj = await subtle.importKey("raw", sharedKeyBuf, "AES-GCM", true, [
            "encrypt",
            "decrypt",
        ]);
    }

    async encrypt(data: unknown) {
        if (this.sharedKeyObj === null) {
            throw new Error("Key is not loaded nor was generated.");
        }

        return await new CompactEncrypt(
            new TextEncoder().encode(JSON.stringify(data)))
            .setProtectedHeader({alg: 'dir', enc: 'A128GCM'})
            .encrypt(this.sharedKeyObj);
    }

    async decrypt(jwe: string) {
        if (this.sharedKeyObj === null) {
            throw new Error("Key is not loaded nor was generated.");
        }

        const hdr = decodeProtectedHeader(jwe);

        if (Object.keys(hdr).length !== 2 || hdr.alg !== "dir" || hdr.enc !== "A128GCM") {
            throw new Error("Unexpected type of JWE provided.");
        }

        const { plaintext, protectedHeader } = await compactDecrypt(jwe, this.sharedKeyObj);
        return JSON.parse(new TextDecoder().decode(plaintext));
    }
}

export {JWEUtil};
